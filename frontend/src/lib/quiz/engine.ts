import type { Question, QuizSettings, Session } from './types';

export const BONUS_MS = 5000;
export const DISCOVERY_LENGTH = 20;

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function prepareQuestions(
  bank: readonly Question[],
  settings: QuizSettings,
  random = Math.random,
): Question[] {
  const unique = [...new Map(bank.map((question) => [question.id, question])).values()].filter(
    (question) => question.difficulty === settings.difficulty,
  );
  let pool: Question[];
  if (settings.category === 'all') {
    // Each group of six mixes all themes, including a short discovery round.
    const groups = [...new Set(unique.map((question) => question.category))].map((category) =>
      shuffle(
        unique.filter((question) => question.category === category),
        random,
      ),
    );
    pool = [];
    while (groups.some((group) => group.length)) {
      pool.push(
        ...shuffle(
          groups.flatMap((group) => (group.length ? [group.pop()!] : [])),
          random,
        ),
      );
    }
  } else {
    pool = shuffle(
      unique.filter((question) => question.category === settings.category),
      random,
    );
  }
  if (settings.mode === 'discovery') pool = pool.slice(0, DISCOVERY_LENGTH);
  return pool.map((question) => {
    const order = shuffle(
      question.options.map((_, index) => index),
      random,
    );
    return {
      ...question,
      options: order.map((index) => question.options[index]),
      answer: order.indexOf(question.answer),
      optionOrder: order.map((index) => question.optionOrder?.[index] ?? index),
    };
  });
}

export function startSession(questions: Question[], settings: QuizSettings, now: number): Session {
  if (!questions.length) throw new Error('Aucune question disponible.');
  const remainingMs = settings.mode === 'timed' ? settings.duration * 1000 : 0;
  return {
    settings,
    questions,
    index: 0,
    answers: [],
    phase: 'question',
    remainingMs,
    deadline: settings.mode === 'timed' ? now + remainingMs : null,
  };
}

export type GameAction =
  | { type: 'tick' | 'next'; now: number }
  | { type: 'answer'; selected: number; now: number };

export function reduceSession(state: Session, action: GameAction): Session {
  if (state.phase === 'finished') return state;
  if (state.phase === 'question' && state.deadline !== null && action.now >= state.deadline) {
    return {
      ...state,
      phase: 'finished',
      deadline: null,
      remainingMs: 0,
      endReason: 'timeout',
      expiredQuestion: state.questions[state.index],
    };
  }
  if (action.type === 'tick') {
    return state.phase === 'question' && state.deadline !== null
      ? { ...state, remainingMs: Math.max(0, state.deadline - action.now) }
      : state;
  }
  if (action.type === 'answer') {
    const question = state.questions[state.index];
    if (
      state.phase !== 'question' ||
      !Number.isInteger(action.selected) ||
      action.selected < 0 ||
      action.selected >= question.options.length
    )
      return state;
    const correct = action.selected === question.answer;
    return {
      ...state,
      phase: 'feedback',
      deadline: null,
      remainingMs:
        state.deadline === null ? 0 : state.deadline - action.now + (correct ? BONUS_MS : 0),
      answers: [...state.answers, { question, selected: action.selected, correct }],
    };
  }
  if (state.phase !== 'feedback') return state;
  if (state.index === state.questions.length - 1) {
    return { ...state, phase: 'finished', endReason: 'complete', deadline: null };
  }
  return {
    ...state,
    phase: 'question',
    index: state.index + 1,
    deadline: state.settings.mode === 'timed' ? action.now + state.remainingMs : null,
  };
}

export function scoreSession(session: Session): number {
  return session.answers.filter((answer) => answer.correct).length;
}
