import { BONUS_MS, prepareQuestions, reduceSession, shuffle, startSession } from '../engine';
import type { CategoryId, Question, QuizSettings } from '../types';

const categories: CategoryId[] = ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual'];
const bank: Question[] = categories.flatMap((category) =>
  Array.from({ length: 20 }, (_, index) => ({
    id: `${category}-${index}`,
    category,
    difficulty: 'medium' as const,
    animal: 'Animal',
    prompt: `Question ${category}-${index}`,
    options: ['Oui', 'Non', 'Parfois', 'Jamais'],
    answer: 0,
    explanation: 'Explication',
    didYouKnow: 'Une découverte',
  })),
);
const settings: QuizSettings = {
  category: 'all',
  mode: 'timed',
  duration: 60,
  difficulty: 'medium',
};
const start = () => startSession(prepareQuestions(bank, settings), settings, 1000);

describe('Sélection des questions', () => {
  it('mélange les six thèmes dans chaque partie découverte sans répétition', () => {
    for (let run = 0; run < 30; run++) {
      const questions = prepareQuestions(bank, { ...settings, mode: 'discovery' });
      expect(questions).toHaveLength(20);
      expect(new Set(questions.map((q) => q.category)).size).toBe(6);
      expect(new Set(questions.map((q) => q.id)).size).toBe(20);
    }
  });
  it('respecte le thème choisi et ne modifie pas les banques', () => {
    const before = JSON.stringify(bank);
    const questions = prepareQuestions(bank, { ...settings, category: 'birds' });
    expect(questions).toHaveLength(20);
    expect(questions.every((q) => q.category === 'birds')).toBe(true);
    expect(JSON.stringify(bank)).toBe(before);
  });
  it('préserve la bonne réponse après mélange des options et retire les doublons', () => {
    const questions = prepareQuestions([...bank, ...bank], settings, () => 0);
    expect(questions).toHaveLength(120);
    expect(questions.every((q) => q.options[q.answer] === 'Oui')).toBe(true);
    expect(questions.some((q) => q.answer !== 0)).toBe(true);
    expect(shuffle([])).toEqual([]);
  });
  it('refuse de démarrer une banque vide', () => {
    expect(() => startSession([], settings, 0)).toThrow('Aucune question');
  });
});

describe('Chronomètre et protection des réponses', () => {
  it('ajoute exactement cinq secondes une seule fois et suspend le temps pour lire', () => {
    let session = start();
    const answer = session.questions[0].answer;
    session = reduceSession(session, { type: 'answer', selected: answer, now: 11000 });
    expect(session.remainingMs).toBe(50000 + BONUS_MS);
    expect(session.answers).toHaveLength(1);
    expect(session.phase).toBe('feedback');
    expect(session.deadline).toBeNull();
    expect(reduceSession(session, { type: 'answer', selected: answer, now: 12000 })).toBe(session);
    expect(reduceSession(session, { type: 'tick', now: 999999 })).toBe(session);
    session = reduceSession(session, { type: 'next', now: 1000000 });
    expect(session.deadline).toBe(1055000);
    expect(session.index).toBe(1);
    expect(reduceSession(session, { type: 'next', now: 1000000 })).toBe(session);
  });
  it('ne donne pas de bonus à une mauvaise réponse', () => {
    const session = start();
    const wrong = (session.questions[0].answer + 1) % 4;
    const result = reduceSession(session, { type: 'answer', selected: wrong, now: 11000 });
    expect(result.remainingMs).toBe(50000);
    expect(result.answers[0].correct).toBe(false);
  });
  it.each([61000, 61001, 999999])('rejette une réponse hors délai même sans tick à %s', (now) => {
    const session = start();
    const result = reduceSession(session, {
      type: 'answer',
      selected: session.questions[0].answer,
      now,
    });
    expect(result.phase).toBe('finished');
    expect(result.endReason).toBe('timeout');
    expect(result.answers).toHaveLength(0);
    expect(result.expiredQuestion?.id).toBe(session.questions[0].id);
  });
  it('accepte une réponse juste avant la limite', () => {
    const session = start();
    const result = reduceSession(session, {
      type: 'answer',
      selected: session.questions[0].answer,
      now: 60999,
    });
    expect(result.phase).toBe('feedback');
    expect(result.remainingMs).toBe(5001);
  });
  it('calcule le temps à partir de la date limite malgré les ticks retardés', () => {
    let session = start();
    session = reduceSession(session, { type: 'tick', now: 31500 });
    expect(session.remainingMs).toBe(29500);
    session = reduceSession(session, { type: 'tick', now: 90000 });
    expect(session.phase).toBe('finished');
    expect(session.remainingMs).toBe(0);
    expect(reduceSession(session, { type: 'next', now: 91000 })).toBe(session);
  });
  it.each([-1, 4, 0.5, NaN])('ignore les indices de réponse invalides %s', (selected) => {
    const session = start();
    expect(reduceSession(session, { type: 'answer', selected, now: 2000 })).toBe(session);
  });
  it('termine sans recycler les questions quand la banque est épuisée', () => {
    let session = startSession([bank[0]], settings, 1000);
    session = reduceSession(session, { type: 'answer', selected: 0, now: 2000 });
    session = reduceSession(session, { type: 'next', now: 5000 });
    expect(session.phase).toBe('finished');
    expect(session.endReason).toBe('complete');
  });
  it('la découverte n’expire jamais et termine après les vingt réponses', () => {
    const config: QuizSettings = { ...settings, mode: 'discovery' };
    let session = startSession(prepareQuestions(bank, config), config, 0);
    expect(reduceSession(session, { type: 'tick', now: 999999999 })).toBe(session);
    for (let i = 0; i < 20; i++) {
      session = reduceSession(session, {
        type: 'answer',
        selected: session.questions[i].answer,
        now: i * 10000,
      });
      session = reduceSession(session, { type: 'next', now: i * 10000 + 9000 });
    }
    expect(session.phase).toBe('finished');
    expect(session.answers.filter((a) => a.correct)).toHaveLength(20);
  });
});
