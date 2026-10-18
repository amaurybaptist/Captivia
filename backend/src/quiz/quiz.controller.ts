import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateQuizRunDto,
  QuizLeaderboardQueryDto,
  SubmitQuizAnswerDto,
} from './quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly service: QuizService) {}

  @Post('runs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createRun(
    @Req() req: { user: { id: string } },
    @Body() body: CreateQuizRunDto,
  ) {
    if (body.mode && body.mode !== 'discovery')
      return this.service.rejectRankedMode();
    return this.service.createRun(req.user.id, body.category, body.difficulty);
  }

  @Post('runs/:id/answers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  answer(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: SubmitQuizAnswerDto,
  ) {
    return this.service.submitAnswer(
      req.user.id,
      id,
      body.questionId,
      body.selected,
    );
  }

  @Get('leaderboard')
  leaderboard(@Query() query: QuizLeaderboardQueryDto) {
    return this.service.leaderboard(query.category, query.difficulty);
  }
}
