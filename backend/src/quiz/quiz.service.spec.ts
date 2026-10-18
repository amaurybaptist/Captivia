import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  QuizService,
  type QuizCategory,
  type QuizDifficulty,
} from './quiz.service';

type MockAnswer = {
  runId: string;
  questionId: string;
  position: number;
  selected: number;
  correct: boolean;
};

type MockRun = {
  id: string;
  userId: string;
  category: string;
  difficulty: string;
  questionIds: string[];
  score: number;
  createdAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  answers: MockAnswer[];
};

type CreateRunArgs = {
  data: {
    userId: string;
    category: string;
    difficulty: string;
    questionIds: string[];
    createdAt: Date;
    expiresAt: Date;
  };
  select: { id: true; questionIds: true; score: true };
};
type CreatedRun = { id: string; questionIds: string[]; score: number };
type FindRunArgs = {
  where: { id: string };
  include: { answers: { orderBy: { position: 'asc' } } };
};
type UpdateRunArgs = {
  where: { id: string };
  data: { score: number; completedAt?: Date };
};
type CreateAnswerArgs = { data: MockAnswer };
type LeaderboardRow = {
  rank: bigint;
  userId: string;
  score: number;
  totalPlayers: bigint;
};

type QuizTransactionMock = {
  $queryRaw: jest.Mock<Promise<unknown>, [unknown]>;
  quizRun: {
    findUnique: jest.Mock<Promise<MockRun | null>, [FindRunArgs]>;
    update: jest.Mock<Promise<MockRun>, [UpdateRunArgs]>;
  };
  quizRunAnswer: {
    create: jest.Mock<Promise<MockAnswer>, [CreateAnswerArgs]>;
  };
};

type PrismaMock = {
  quizRun: {
    create: jest.Mock<Promise<CreatedRun>, [CreateRunArgs]>;
    findMany: jest.Mock<Promise<MockRun[]>, [unknown]>;
  };
  $queryRaw: jest.Mock<Promise<LeaderboardRow[]>, [unknown]>;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(tx: QuizTransactionMock) => Promise<unknown>]
  >;
};

const asQuizCategory = (value: string): QuizCategory => value as QuizCategory;
const asQuizDifficulty = (value: string): QuizDifficulty =>
  value as QuizDifficulty;

jest.mock('./data/questions.json', () => [
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `fish-${index}`,
    category: 'fish',
    difficulty: 'easy',
    answer: 2,
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `bird-${index}`,
    category: 'birds',
    difficulty: 'easy',
    answer: 1,
  })),
]);

describe('QuizService', () => {
  const userId = 'user-secret';
  let service: QuizService;
  let run: MockRun;
  let tx: QuizTransactionMock;
  let prisma: PrismaMock;

  beforeEach(() => {
    run = {
      id: 'run-1',
      userId,
      category: 'fish',
      difficulty: 'easy',
      questionIds: Array.from({ length: 20 }, (_, index) => `fish-${index}`),
      score: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      completedAt: null,
      answers: [],
    };
    tx = {
      $queryRaw: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue([]),
      quizRun: {
        findUnique: jest
          .fn<Promise<MockRun | null>, [FindRunArgs]>()
          .mockImplementation(() => Promise.resolve(run)),
        update: jest
          .fn<Promise<MockRun>, [UpdateRunArgs]>()
          .mockImplementation(({ data }) => {
            Object.assign(run, data);
            return Promise.resolve(run);
          }),
      },
      quizRunAnswer: {
        create: jest
          .fn<Promise<MockAnswer>, [CreateAnswerArgs]>()
          .mockImplementation(({ data }) => {
            run.answers.push(data);
            return Promise.resolve(data);
          }),
      },
    };
    prisma = {
      quizRun: {
        create: jest
          .fn<Promise<CreatedRun>, [CreateRunArgs]>()
          .mockImplementation(({ data }) =>
            Promise.resolve({
              id: 'run-1',
              questionIds: data.questionIds,
              score: 0,
            }),
          ),
        findMany: jest
          .fn<Promise<MockRun[]>, [unknown]>()
          .mockResolvedValue([]),
      },
      $queryRaw: jest.fn<Promise<LeaderboardRow[]>, [unknown]>(),
      $transaction: jest
        .fn<Promise<unknown>, [(tx: QuizTransactionMock) => Promise<unknown>]>()
        .mockImplementation((callback) => callback(tx)),
    };
    service = new QuizService(prisma as unknown as PrismaService);
  });

  it('selects 20 distinct server questions and records no client score', async () => {
    const result = await service.createRun(userId, 'fish', 'easy');
    expect(result.questionIds).toHaveLength(20);
    expect(new Set(result.questionIds).size).toBe(20);
    expect(
      Object.hasOwn(prisma.quizRun.create.mock.calls[0][0].data, 'score'),
    ).toBe(false);
  });

  it('scores from the server bank and makes an identical retry idempotent', async () => {
    const first = await service.submitAnswer(userId, 'run-1', 'fish-0', 2);
    const retry = await service.submitAnswer(userId, 'run-1', 'fish-0', 2);
    expect(first).toEqual({
      id: 'run-1',
      score: 1,
      total: 1,
      completed: false,
    });
    expect(retry).toEqual(first);
    expect(tx.quizRunAnswer.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a changed retry, an out-of-order answer, and another account', async () => {
    await service.submitAnswer(userId, 'run-1', 'fish-0', 2);
    await expect(
      service.submitAnswer(userId, 'run-1', 'fish-0', 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.submitAnswer(userId, 'run-1', 'fish-2', 2),
    ).rejects.toBeInstanceOf(ConflictException);
    run.userId = 'other-user';
    await expect(
      service.submitAnswer(userId, 'run-1', 'fish-1', 2),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('locks the run before loading it and marks the twentieth answer complete', async () => {
    for (let index = 0; index < 20; index++) {
      const result = await service.submitAnswer(
        userId,
        'run-1',
        `fish-${index}`,
        2,
      );
      expect(result.total).toBe(index + 1);
    }
    expect(run.completedAt).toBeInstanceOf(Date);
    expect(run.score).toBe(20);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(20);
  });

  it('rejects expired runs and invalid categories or difficulty levels', async () => {
    run.expiresAt = new Date(Date.now() - 1);
    await expect(
      service.submitAnswer(userId, 'run-1', 'fish-0', 2),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createRun(userId, asQuizCategory('bogus'), 'easy'),
    ).rejects.toBeTruthy();
    await expect(
      service.createRun(userId, 'fish', asQuizDifficulty('expert')),
    ).rejects.toBeTruthy();
  });

  it('mixes categories for all and honors category and difficulty filters', async () => {
    await service.createRun(userId, 'all', 'easy');
    const ids = prisma.quizRun.create.mock.calls[0][0].data.questionIds;
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    expect(ids.filter((id) => id.startsWith('fish-'))).toHaveLength(10);
    expect(ids.filter((id) => id.startsWith('bird-'))).toHaveLength(10);
    await service.createRun(userId, 'birds', 'easy');
    expect(
      prisma.quizRun.create.mock.calls[1][0].data.questionIds.every((id) =>
        id.startsWith('bird-'),
      ),
    ).toBe(true);
    await expect(
      service.createRun(userId, 'birds', 'hard'),
    ).rejects.toBeTruthy();
  });

  it('publishes only stable aliases and the best run per player', async () => {
    process.env.JWT_SECRET = 'a-test-secret-long-enough';
    prisma.$queryRaw.mockResolvedValue([
      { rank: 1n, userId: 'private-a', score: 18, totalPlayers: 2n },
      { rank: 1n, userId: 'private-b', score: 18, totalPlayers: 2n },
    ]);
    const result = await service.leaderboard('fish', 'easy');
    expect(result.totalPlayers).toBe(2);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].rank).toBe(result.entries[1].rank);
    expect(JSON.stringify(result)).not.toContain('private-a');
    expect(result.entries[0].alias).toMatch(/^Naturalist [A-F0-9]{10}$/);
  });
});
