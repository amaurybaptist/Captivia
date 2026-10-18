export type CategoryId = 'birds' | 'reptiles' | 'insects' | 'fish' | 'mammals' | 'unusual';
export type CategorySelection = CategoryId | 'all';
export type QuizMode = 'discovery' | 'timed';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuizLocale = 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt';

export interface Question {
  id: string;
  category: CategoryId;
  difficulty: Difficulty;
  animal: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  didYouKnow: string;
  image?: QuestionImage;
  /** Display option index -> canonical bank option index, for server verification. */
  optionOrder?: number[];
}

export interface QuestionImage {
  src: string;
  title?: string;
  width: number;
  height: number;
  creator: string;
  licenseName: string;
  licenseUrl: string;
  sourcePage: string;
  caption: string;
}

export interface QuizSettings {
  category: CategorySelection;
  mode: QuizMode;
  duration: 30 | 60 | 90;
  difficulty: Difficulty;
}

export interface Answer {
  question: Question;
  selected: number;
  correct: boolean;
}

export interface Session {
  settings: QuizSettings;
  questions: Question[];
  index: number;
  answers: Answer[];
  phase: 'question' | 'feedback' | 'finished';
  deadline: number | null;
  remainingMs: number;
  endReason?: 'complete' | 'timeout';
  expiredQuestion?: Question;
}
