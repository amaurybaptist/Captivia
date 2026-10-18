import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as questionBank from './data/questions.json';

export const QUIZ_CATEGORIES = [
  'birds',
  'reptiles',
  'insects',
  'fish',
  'mammals',
  'unusual',
] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number] | 'all';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
type BankRow = {
  id: string;
  category: Exclude<QuizCategory, 'all'>;
  difficulty: QuizDifficulty;
  answer: number;
};
export const QUIZ_BANK = questionBank as BankRow[];
const QUESTION_COUNT = 20;
const RUN_LIFETIME_MS = 2 * 60 * 60 * 1000;

function shuffled<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(
    userId: string,
    category: QuizCategory,
    difficulty: QuizDifficulty,
  ) {
    this.validateSelection(category, difficulty);
    const selected = this.selectQuestions(category, difficulty);
    const createdAt = new Date();
    const run = await this.prisma.quizRun.create({
      data: {
        userId,
        category,
        difficulty,
        questionIds: selected.map((question) => question.id),
        createdAt,
        expiresAt: new Date(createdAt.getTime() + RUN_LIFETIME_MS),
      },
      select: { id: true, questionIds: true, score: true },
    });
    return run;
  }

  rejectRankedMode(): never {
    throw new BadRequestException(
      'Le mode chronométré reste un entraînement non classé.',
    );
  }

  async submitAnswer(
    userId: string,
    runId: string,
    questionId: string,
    selected: number,
  ) {
    if (
      !questionId ||
      typeof questionId !== 'string' ||
      questionId.length > 120
    ) {
      throw new BadRequestException('Question invalide.');
    }
    if (!Number.isInteger(selected) || selected < 0 || selected > 3) {
      throw new BadRequestException('Réponse invalide.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Serialize submissions for this run so simultaneous retries cannot lose score updates.
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "QuizRun" WHERE "id" = ${runId} FOR UPDATE`,
      );
      const run = await tx.quizRun.findUnique({
        where: { id: runId },
        include: { answers: { orderBy: { position: 'asc' } } },
      });
      if (!run) throw new NotFoundException('Partie introuvable.');
      if (run.userId !== userId) throw new ForbiddenException();
      const prior = run.answers.find(
        (answer) => answer.questionId === questionId,
      );
      if (prior) {
        if (prior.selected !== selected)
          throw new ConflictException('Cette réponse a déjà été enregistrée.');
        return {
          id: run.id,
          score: run.score,
          total: run.answers.length,
          completed: Boolean(run.completedAt),
        };
      }
      if (run.completedAt)
        throw new ConflictException('Cette partie est terminée.');
      if (run.expiresAt.getTime() <= Date.now())
        throw new ConflictException('Cette partie a expiré.');
      const position = run.answers.length;
      if (position >= QUESTION_COUNT)
        throw new ConflictException('Cette partie est terminée.');
      if (run.questionIds[position] !== questionId) {
        throw new ConflictException(
          'Les réponses doivent suivre l’ordre de la partie.',
        );
      }
      const bankQuestion = QUIZ_BANK.find(
        (question) =>
          question.id === questionId &&
          question.difficulty === run.difficulty &&
          (run.category === 'all' || question.category === run.category),
      );
      if (!bankQuestion || !run.questionIds.includes(questionId)) {
        throw new ConflictException(
          'Question absente de la banque de cette partie.',
        );
      }
      const correct = selected === bankQuestion.answer;
      const score = run.score + (correct ? 1 : 0);
      const now = new Date();
      await tx.quizRunAnswer.create({
        data: { runId, questionId, position, selected, correct },
      });
      const completedAt = position + 1 === QUESTION_COUNT ? now : null;
      await tx.quizRun.update({
        where: { id: runId },
        data: { score, ...(completedAt ? { completedAt } : {}) },
      });
      return {
        id: runId,
        score,
        total: position + 1,
        completed: Boolean(completedAt),
      };
    });
  }

  async leaderboard(category: QuizCategory, difficulty: QuizDifficulty) {
    this.validateSelection(category, difficulty);
    const rows = await this.prisma.$queryRaw<
      Array<{
        rank: bigint;
        userId: string;
        score: number;
        totalPlayers: bigint;
      }>
    >(Prisma.sql`
      WITH ranked_runs AS (
        SELECT r."id", r."userId", r."score", r."completedAt",
          ROW_NUMBER() OVER (
            PARTITION BY r."userId"
            ORDER BY r."score" DESC, r."completedAt" ASC, r."id" ASC
          ) AS user_run_rank
        FROM "QuizRun" r
        WHERE r."category" = ${category}
          AND r."difficulty" = ${difficulty}
          AND r."completedAt" IS NOT NULL
      ), best_runs AS (
        SELECT "id", "userId", "score", "completedAt"
        FROM ranked_runs WHERE user_run_rank = 1
      )
      SELECT RANK() OVER (ORDER BY b."score" DESC) AS rank,
        b."userId", b."score", COUNT(*) OVER () AS "totalPlayers"
      FROM best_runs b
      ORDER BY b."score" DESC, b."completedAt" ASC, b."id" ASC
      LIMIT 50
    `);
    const entries = rows.map((run) => ({
      rank: Number(run.rank),
      alias: this.alias(run.userId),
      score: run.score,
      total: QUESTION_COUNT,
    }));
    return {
      entries,
      totalPlayers: rows.length ? Number(rows[0].totalPlayers) : 0,
    };
  }

  private selectQuestions(
    category: QuizCategory,
    difficulty: QuizDifficulty,
  ): BankRow[] {
    const pool = QUIZ_BANK.filter(
      (question) =>
        question.difficulty === difficulty &&
        (category === 'all' || question.category === category),
    );
    let selected: BankRow[];
    if (category === 'all') {
      const themes = QUIZ_CATEGORIES.map((theme) =>
        shuffled(pool.filter((q) => q.category === theme)),
      );
      selected = [];
      while (
        selected.length < QUESTION_COUNT &&
        themes.some((theme) => theme.length)
      ) {
        for (const theme of themes) {
          if (theme.length && selected.length < QUESTION_COUNT)
            selected.push(theme.pop()!);
        }
      }
    } else selected = shuffled(pool).slice(0, QUESTION_COUNT);
    if (
      selected.length < QUESTION_COUNT ||
      new Set(selected.map((q) => q.id)).size !== QUESTION_COUNT
    ) {
      throw new BadRequestException(
        'Banque insuffisante pour cette catégorie et ce niveau.',
      );
    }
    return selected;
  }

  private validateSelection(
    category: string,
    difficulty: string,
  ): asserts category is QuizCategory {
    if (
      !(category === 'all' || QUIZ_CATEGORIES.includes(category as never)) ||
      !(['easy', 'medium', 'hard'] as string[]).includes(difficulty)
    ) {
      throw new BadRequestException('Catégorie ou difficulté invalide.');
    }
  }

  private alias(userId: string): string {
    const secret = process.env.QUIZ_ALIAS_SECRET || process.env.JWT_SECRET;
    if (!secret)
      throw new Error('JWT_SECRET is required to derive private quiz aliases.');
    return `Naturalist ${createHmac('sha256', secret).update(userId).digest('hex').slice(0, 10).toUpperCase()}`;
  }
}
