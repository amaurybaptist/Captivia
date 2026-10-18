CREATE TABLE "QuizRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "questionIds" TEXT[] NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "QuizRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizRun_category_check" CHECK ("category" IN ('all', 'birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual')),
  CONSTRAINT "QuizRun_difficulty_check" CHECK ("difficulty" IN ('easy', 'medium', 'hard')),
  CONSTRAINT "QuizRun_questionIds_count_check" CHECK (cardinality("questionIds") = 20),
  CONSTRAINT "QuizRun_score_check" CHECK ("score" BETWEEN 0 AND 20),
  CONSTRAINT "QuizRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "QuizRun_userId_category_difficulty_score_completedAt_idx" ON "QuizRun"("userId", "category", "difficulty", "score", "completedAt");
CREATE INDEX "QuizRun_expiresAt_idx" ON "QuizRun"("expiresAt");
CREATE TABLE "QuizRunAnswer" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "selected" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizRunAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuizRunAnswer_position_check" CHECK ("position" BETWEEN 0 AND 19),
  CONSTRAINT "QuizRunAnswer_selected_check" CHECK ("selected" BETWEEN 0 AND 3),
  CONSTRAINT "QuizRunAnswer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "QuizRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuizRunAnswer_runId_questionId_key" ON "QuizRunAnswer"("runId", "questionId");
CREATE UNIQUE INDEX "QuizRunAnswer_runId_position_key" ON "QuizRunAnswer"("runId", "position");
CREATE INDEX "QuizRunAnswer_runId_position_idx" ON "QuizRunAnswer"("runId", "position");
