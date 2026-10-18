import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  QUIZ_CATEGORIES,
  type QuizCategory,
  type QuizDifficulty,
} from './quiz.service';

const categories = ['all', ...QUIZ_CATEGORIES];
const difficulties = ['easy', 'medium', 'hard'];

export class CreateQuizRunDto {
  @IsIn(categories)
  category!: QuizCategory;

  @IsIn(difficulties)
  difficulty!: QuizDifficulty;

  @IsOptional()
  @IsIn(['discovery', 'timed'])
  mode?: string;
}

export class SubmitQuizAnswerDto {
  @IsString()
  @MaxLength(120)
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  selected!: number;
}

export class QuizLeaderboardQueryDto {
  @IsIn(categories)
  category!: QuizCategory;

  @IsIn(difficulties)
  difficulty!: QuizDifficulty;
}
