import { readRecord, saveRecord } from '../records';
import type { QuizSettings } from '../types';

const config: QuizSettings = {
  category: 'birds',
  mode: 'discovery',
  duration: 60,
  difficulty: 'medium',
};
beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

it('sépare les records par thème, mode et durée', () => {
  expect(readRecord(config)).toBeNull();
  expect(saveRecord(config, 8)).toEqual({ best: 8, saved: true });
  expect(saveRecord(config, 2).best).toBe(8);
  expect(readRecord({ ...config, category: 'all' })).toBeNull();
  expect(readRecord({ ...config, difficulty: 'hard' })).toBeNull();
  expect(readRecord({ ...config, mode: 'timed' })).toBeNull();
  saveRecord({ ...config, mode: 'timed', duration: 30 }, 4);
  expect(readRecord({ ...config, mode: 'timed', duration: 60 })).toBeNull();
});

it.each(['oops', '-1', '21', '1.2', '{}', 'null', '"5"'])(
  'ignore un record invalide %s',
  (value) => {
    localStorage.setItem('captivia.quiz.v2:birds:medium:discovery:20', value);
    expect(readRecord(config)).toBeNull();
  },
);

it('reste utilisable si le stockage est refusé ou saturé', () => {
  jest.spyOn(localStorage, 'getItem').mockImplementation(() => {
    throw new Error('Refusé');
  });
  jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('Saturé');
  });
  expect(readRecord(config)).toBeNull();
  expect(saveRecord(config, 7)).toEqual({ best: 7, saved: false });
});
