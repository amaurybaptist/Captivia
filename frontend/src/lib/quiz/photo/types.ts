import type { CategoryId, Difficulty, QuestionImage } from '../types';
export interface PhotoAnimal {
  id: string;
  scientificName: string;
  animal: string;
  category: CategoryId;
  difficulty: Difficulty;
  group: string;
  recognition: string;
  didYouKnow: string;
  sourceUrl: string;
  distractors: string[];
}
export type PhotoText = Pick<PhotoAnimal, 'id' | 'animal' | 'recognition' | 'didYouKnow'>;
export interface PhotoQuestion extends PhotoAnimal {
  image: QuestionImage;
  options: { id: string; label: string }[];
  answer: number;
}
