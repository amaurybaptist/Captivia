'use client';

import { useEffect, useRef, useState } from 'react';
import fr from '@/lib/quiz/locales/fr.json';
import { format, type QuizCopy } from '@/lib/quiz/i18n';
import type { QuizLocale, Difficulty } from '@/lib/quiz/types';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Gamepad2,
  Lightbulb,
  Shuffle,
  Trophy,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  QUESTIONS_PER_CATEGORY,
  TOTAL_QUESTIONS,
  loadQuestions,
  questionCount,
} from '@/lib/quiz/catalog';
import {
  BONUS_MS,
  prepareQuestions,
  reduceSession,
  scoreSession,
  startSession,
} from '@/lib/quiz/engine';
import { readRecord, saveRecord } from '@/lib/quiz/records';
import type { CategorySelection } from '@/lib/quiz/types';
import type { Question, QuizSettings, Session } from '@/lib/quiz/types';
import type { GameAction } from '@/lib/quiz/engine';
import QuizDog from './QuizDog';
import QuestionPhoto from './QuestionPhoto';
import QuizLeaderboard from './QuizLeaderboard';
import {
  createRankedRun,
  submitRankedAnswer,
  type RankedRun,
  type QuizAccount,
} from '@/lib/quiz/online';
import './quiz.css';

const INITIAL_SETTINGS: QuizSettings = {
  category: 'all',
  mode: 'discovery',
  duration: 60,
  difficulty: 'medium',
};

function LearningNotes({ question, copy }: { question: Question; copy: QuizCopy }) {
  const source = CATEGORIES.find(({ id }) => id === question.category)!;
  return (
    <div className="quiz-learning">
      <div>
        <h3>{copy.why}</h3>
        <p>{question.explanation}</p>
      </div>
      <aside className="quiz-fact">
        <h3>
          <Lightbulb size={18} aria-hidden="true" /> {copy.didYouKnow}
        </h3>
        <p>{question.didYouKnow}</p>
      </aside>
      <a href={source.source} target="_blank" rel="noopener noreferrer" className="quiz-source">
        {copy.learnMore} <span className="quiz-sr-only">{copy.externalEnglish}</span> ↗
      </a>
    </div>
  );
}

export default function AnimalQuiz({
  locale = 'fr',
  copy = fr,
  account = null,
}: {
  locale?: QuizLocale;
  copy?: QuizCopy;
  account?: QuizAccount | null;
}) {
  const t = (key: keyof QuizCopy, values?: Record<string, string | number>) =>
    format(copy, key, values);
  const label = (id: CategorySelection) =>
    id === 'all' ? copy.all : copy.categoriesData[id].label;
  const [settings, setSettings] = useState<QuizSettings>(INITIAL_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [ranked, setRanked] = useState(false);
  const [rankedRun, setRankedRun] = useState<RankedRun | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [rankedSaved, setRankedSaved] = useState(false);
  const answerLock = useRef(false);
  const pendingRef = useRef<{ questionId: string; selected: number } | null>(null);
  const [error, setError] = useState('');
  const [record, setRecord] = useState<number | null>(null);
  const [recordSaved, setRecordSaved] = useState(true);
  const request = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const phase = session?.phase;
  const index = session?.index;

  useEffect(() => {
    setRecord(readRecord(settings));
  }, [settings]);

  useEffect(() => {
    if (phase !== 'question' || session?.settings.mode !== 'timed') return;
    const timer = window.setInterval(() => {
      setSession((current) =>
        current ? reduceSession(current, { type: 'tick', now: performance.now() }) : current,
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, index, session?.settings.mode]);

  useEffect(() => {
    if (phase === 'finished' && session) {
      const result = saveRecord(session.settings, scoreSession(session));
      setRecord(result.best);
      setRecordSaved(result.saved);
    }
    // Focus the heading once per screen; timer updates must never steal focus.
    (phase === 'feedback' ? feedbackRef : titleRef).current?.focus();
    // Session contents change on every tick; only screen transitions matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function begin() {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const bank = await loadQuestions(settings.category, locale);
      if (request.current !== id) return;
      const online = ranked && settings.mode === 'discovery';
      let run: RankedRun | null = null;
      let questions: Question[];
      if (online) {
        if (!account) throw new Error('Account required');
        run = await createRankedRun(settings, account);
        if (request.current !== id) return;
        const byId = new Map(bank.map((question) => [question.id, question]));
        const selected = run.questionIds.map((questionId) => byId.get(questionId));
        if (selected.some((question) => !question || question.difficulty !== settings.difficulty))
          throw new Error('Server bank mismatch');
        questions = prepareQuestions(selected as Question[], settings).sort(
          (a, b) => run!.questionIds.indexOf(a.id) - run!.questionIds.indexOf(b.id),
        );
        if (questions.length !== 20) throw new Error('Invalid ranked pool');
      } else questions = prepareQuestions(bank, settings);
      if (!questions.length) throw new Error('Empty level');
      setRankedRun(run);
      setRankedSaved(false);
      pendingRef.current = null;
      setPendingChoice(null);
      setSending(false);
      answerLock.current = false;
      setSession(startSession(questions, settings, performance.now()));
      setRecordSaved(true);
    } catch {
      if (request.current === id)
        setError(ranked && settings.mode === 'discovery' ? copy.rankedStartError : copy.loadError);
    } finally {
      if (request.current === id) setLoading(false);
    }
  }

  async function selectAnswer(selected: number) {
    if (!session || session.phase !== 'question' || answerLock.current) return;
    if (!rankedRun) {
      act({ type: 'answer', selected, now: performance.now() });
      return;
    }
    if (!account) return;
    const question = session.questions[session.index];
    if (
      pendingRef.current &&
      (pendingRef.current.questionId !== question.id || pendingRef.current.selected !== selected)
    )
      return;
    answerLock.current = true;
    pendingRef.current = { questionId: question.id, selected };
    setPendingChoice(selected);
    setSending(true);
    setError('');
    const version = request.current;
    try {
      const result = await submitRankedAnswer(
        rankedRun.id,
        question.id,
        question.optionOrder?.[selected] ?? selected,
        account,
      );
      if (request.current !== version) return;
      const expected = scoreSession(session) + (selected === question.answer ? 1 : 0);
      if (result.total !== session.answers.length + 1 || result.score !== expected)
        throw new Error('Score mismatch');
      setRankedSaved(result.completed);
      pendingRef.current = null;
      setPendingChoice(null);
      act({ type: 'answer', selected, now: performance.now() });
    } catch {
      if (request.current === version) setError(copy.rankedError);
    } finally {
      if (request.current === version) {
        setSending(false);
        answerLock.current = false;
      }
    }
  }

  function leaveSession() {
    ++request.current;
    pendingRef.current = null;
    answerLock.current = false;
    setPendingChoice(null);
    setSending(false);
    setRankedRun(null);
    setError('');
    setSession(null);
  }

  function act(action: GameAction) {
    setSession((current) => (current ? reduceSession(current, action) : current));
  }

  function chooseCategory(category: CategorySelection) {
    setSettings((current) => ({ ...current, category }));
  }

  const currentQuestion = session?.questions[session.index];
  const lastAnswer = session?.answers.at(-1);
  const score = session ? scoreSession(session) : 0;

  return (
    <section className="quiz-page" lang={locale} aria-label={copy.ariaLabel}>
      <header className="quiz-intro">
        <span className="quiz-eyebrow">
          <Gamepad2 size={17} aria-hidden="true" /> {copy.eyebrow}
        </span>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>

      {!session && (
        <>
          <div className="quiz-setup-head">
            <div>
              <h2>{copy.choose}</h2>
              <p>
                {t('bankSummary', {
                  total: TOTAL_QUESTIONS.toLocaleString(locale),
                  count: QUESTIONS_PER_CATEGORY,
                })}
              </p>
            </div>
            <QuizDog mood="waiting" copy={copy} />
          </div>
          <fieldset className="quiz-modes">
            <legend className="quiz-sr-only">{copy.gameMode}</legend>
            <button
              type="button"
              disabled={loading}
              aria-pressed={settings.mode === 'discovery'}
              onClick={() => setSettings({ ...settings, mode: 'discovery' })}
            >
              <Lightbulb size={20} aria-hidden="true" />
              <span>
                <strong>{copy.discovery}</strong>
                <small>{copy.discoveryShort}</small>
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              aria-pressed={settings.mode === 'timed'}
              onClick={() => setSettings({ ...settings, mode: 'timed' })}
            >
              <Clock3 size={20} aria-hidden="true" />
              <span>
                <strong>{copy.timed}</strong>
                <small>{copy.timedShort}</small>
              </span>
            </button>
          </fieldset>
          <fieldset className="quiz-category-grid">
            <legend>{copy.yourCategory}</legend>
            <button
              type="button"
              className="quiz-category quiz-category--all"
              disabled={loading}
              aria-pressed={settings.category === 'all'}
              onClick={() => chooseCategory('all')}
            >
              <span className="quiz-category-icon">
                <Shuffle size={28} aria-hidden="true" />
              </span>
              <span>
                <strong>{copy.all}</strong>
                <small>
                  {t('allDescription', { count: TOTAL_QUESTIONS.toLocaleString(locale) })}
                </small>
              </span>
              <span className="quiz-category-check" aria-hidden="true">
                {settings.category === 'all' && <Check size={18} />}
              </span>
            </button>
            {CATEGORIES.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`quiz-category quiz-category--${category.id}`}
                disabled={loading}
                aria-pressed={settings.category === category.id}
                onClick={() => chooseCategory(category.id)}
              >
                <span className="quiz-category-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <span>
                  <strong>{copy.categoriesData[category.id].label}</strong>
                  <small>{copy.categoriesData[category.id].description}</small>
                  <span className="quiz-bank-count">
                    {t('questionCount', { count: QUESTIONS_PER_CATEGORY })}
                  </span>
                </span>
                <span className="quiz-category-check" aria-hidden="true">
                  {settings.category === category.id && <Check size={18} />}
                </span>
              </button>
            ))}
          </fieldset>
          <fieldset className="quiz-difficulties">
            <legend>{copy.difficulty}</legend>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
              <button
                type="button"
                key={difficulty}
                disabled={loading}
                aria-pressed={settings.difficulty === difficulty}
                onClick={() => setSettings((current) => ({ ...current, difficulty }))}
              >
                <strong>{copy[difficulty]}</strong>
                <small>{copy[`${difficulty}Description`]}</small>
              </button>
            ))}
          </fieldset>
          <p className="quiz-available">
            {t('available', { count: questionCount(settings.category, settings.difficulty) })}
          </p>
          <div className="quiz-start-panel">
            {settings.mode === 'discovery' ? (
              account ? (
                <label className="quiz-ranked-choice">
                  <input
                    type="checkbox"
                    checked={ranked}
                    disabled={loading}
                    onChange={(event) => setRanked(event.target.checked)}
                  />
                  <span>
                    <strong>{copy.ranked}</strong>
                    <small>{copy.rankedDescription}</small>
                  </span>
                </label>
              ) : (
                <p>
                  {copy.rankedLogin} <a href={`/${locale}/login`}>{copy.login}</a>
                </p>
              )
            ) : (
              <p>{copy.rankedTimed}</p>
            )}
            {settings.mode === 'timed' ? (
              <>
                <label className="quiz-duration">
                  {copy.startTime}
                  <select
                    value={settings.duration}
                    disabled={loading}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        duration: Number(event.target.value) as QuizSettings['duration'],
                      })
                    }
                  >
                    <option value={30}>{t('seconds', { count: 30 })}</option>
                    <option value={60}>{t('seconds', { count: 60 })}</option>
                    <option value={90}>{t('seconds', { count: 90 })}</option>
                  </select>
                </label>
                <p>{t('timedRules', { count: BONUS_MS / 1000 })}</p>
              </>
            ) : (
              <p>{copy.discoveryRules}</p>
            )}
            {record !== null && (
              <p className="quiz-record">
                <Trophy size={17} aria-hidden="true" /> {t('record', { score: record })}
                {settings.mode === 'discovery' ? ' / 20' : ''}
              </p>
            )}
            {error && (
              <p role="alert" className="quiz-error">
                {error}
              </p>
            )}
            <button type="button" className="quiz-primary" disabled={loading} onClick={begin}>
              {loading ? copy.loading : copy.start}
              <ArrowRight size={19} aria-hidden="true" />
            </button>
            <small>{copy.free}</small>
          </div>
          <QuizLeaderboard
            key={`${settings.category}:${settings.difficulty}`}
            settings={settings}
            copy={copy}
          />
        </>
      )}

      {session && session.phase !== 'finished' && currentQuestion && (
        <div className="quiz-play">
          <div className="quiz-play-toolbar">
            <button type="button" className="quiz-text-button" onClick={leaveSession}>
              <ArrowLeft size={17} aria-hidden="true" /> {copy.categories}
            </button>
            <span>
              {label(session.settings.category)} · {copy[session.settings.difficulty]}
              <small className="quiz-session-kind">
                {rankedRun ? copy.rankedSession : copy.practiceSession}
              </small>
            </span>
            <span className="quiz-score">
              <Trophy size={16} aria-hidden="true" /> {score}
            </span>
          </div>
          <div className="quiz-progress-line">
            <span>
              {session.settings.mode === 'discovery'
                ? t('progress', { current: session.index + 1, total: session.questions.length })
                : t('questionNumber', { current: session.index + 1 })}
            </span>
            {session.settings.mode === 'timed' && (
              <span
                className={`quiz-clock${session.remainingMs <= 10000 ? ' quiz-clock--low' : ''}`}
                role="timer"
                aria-label={copy.remaining}
                aria-live="off"
              >
                <Clock3 size={18} aria-hidden="true" />
                <b>{Math.ceil(session.remainingMs / 1000)} s</b>
                {session.phase === 'feedback' && <small>{copy.paused}</small>}
              </span>
            )}
          </div>
          {session.settings.mode === 'discovery' && (
            <progress
              aria-label={copy.progressLabel}
              max={session.questions.length}
              value={session.answers.length}
            />
          )}
          <article className="quiz-question-card">
            <span className="quiz-eyebrow">{label(currentQuestion.category)}</span>
            <h2 ref={titleRef} tabIndex={-1}>
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.image && (
              <QuestionPhoto
                key={currentQuestion.id}
                image={currentQuestion.image}
                copy={copy}
                revealName={session.phase === 'feedback'}
              />
            )}
            <div className="quiz-options" role="group" aria-label={copy.possibleAnswers}>
              {currentQuestion.options.map((option, optionIndex) => {
                const revealed = session.phase === 'feedback';
                const selected = revealed && lastAnswer?.selected === optionIndex;
                const correct = revealed && currentQuestion.answer === optionIndex;
                return (
                  <button
                    type="button"
                    key={`${currentQuestion.id}-${optionIndex}`}
                    disabled={revealed || sending || pendingChoice !== null}
                    className={`quiz-option${correct ? ' is-correct' : selected ? ' is-incorrect' : ''}`}
                    onClick={() => void selectAnswer(optionIndex)}
                  >
                    <span className="quiz-option-letter" aria-hidden="true">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>
                      {option}
                      {revealed && (correct || selected) && (
                        <small>{correct ? copy.correctAnswer : copy.yourAnswer}</small>
                      )}
                    </span>
                    {correct ? (
                      <Check size={21} aria-hidden="true" />
                    ) : selected ? (
                      <X size={21} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </article>
          {sending && <p role="status">{copy.sending}</p>}
          {error && (
            <div className="quiz-error" role="alert">
              <p>{error}</p>
              {pendingChoice !== null && (
                <button
                  type="button"
                  className="quiz-secondary"
                  disabled={sending}
                  onClick={() => void selectAnswer(pendingChoice)}
                >
                  {copy.retry}
                </button>
              )}
            </div>
          )}
          {session.phase === 'feedback' && lastAnswer && (
            <section
              className={`quiz-feedback ${lastAnswer.correct ? 'is-happy' : 'is-learning'}`}
              aria-label={copy.feedbackLabel}
            >
              <div className="quiz-feedback-heading" role="status">
                <QuizDog mood={lastAnswer.correct ? 'happy' : 'sad'} copy={copy} />
                <div>
                  <h2 ref={feedbackRef} tabIndex={-1}>
                    {lastAnswer.correct ? copy.success : copy.incorrect}
                  </h2>
                  <p>{lastAnswer.correct ? copy.successNote : copy.incorrectNote}</p>
                  {lastAnswer.correct && session.settings.mode === 'timed' && (
                    <span className="quiz-bonus">{t('bonus', { count: BONUS_MS / 1000 })}</span>
                  )}
                </div>
              </div>
              <LearningNotes question={currentQuestion} copy={copy} />
              <button
                type="button"
                className="quiz-primary"
                onClick={() => act({ type: 'next', now: performance.now() })}
              >
                {session.index === session.questions.length - 1 ? copy.result : copy.next}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </section>
          )}
        </div>
      )}

      {session?.phase === 'finished' && (
        <div className="quiz-results">
          <div className="quiz-result-hero">
            <QuizDog mood="happy" copy={copy} />
            <span className="quiz-eyebrow">
              {label(session.settings.category)} ·{' '}
              {session.settings.mode === 'timed' ? copy.timed : copy.discovery} ·{' '}
              {copy[session.settings.difficulty]}
            </span>
            <h2 ref={titleRef} tabIndex={-1}>
              {session.endReason === 'timeout' ? copy.timeout : copy.complete}
            </h2>
            <p className="quiz-result-score">
              {score}
              <span> / {session.answers.length}</span>
            </p>
            <p>{t('scoreSummary', { score, count: session.answers.length })}</p>
            {session.answers.length === 0 && <p>{copy.tryDiscovery}</p>}
            {recordSaved ? (
              <p className="quiz-record">
                <Trophy size={17} aria-hidden="true" /> {t('record', { score: record ?? 0 })}
              </p>
            ) : (
              <p>{copy.storageUnavailable}</p>
            )}
            <div className="quiz-result-actions">
              <button type="button" className="quiz-primary" disabled={loading} onClick={begin}>
                {loading ? copy.loading : copy.replay}
                <Shuffle size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="quiz-secondary"
                disabled={loading}
                onClick={leaveSession}
              >
                {copy.changeCategory}
              </button>
            </div>
            {error && (
              <p className="quiz-error" role="alert">
                {error}
              </p>
            )}
          </div>
          {rankedSaved && (
            <p className="quiz-ranked-confirmation" role="status">
              {copy.rankedSaved}
            </p>
          )}
          <QuizLeaderboard
            key={`${session.settings.category}:${session.settings.difficulty}:${rankedSaved}`}
            settings={session.settings}
            copy={copy}
          />
          <h2>{copy.discoveries}</h2>
          {session.expiredQuestion && (
            <details className="quiz-review" open>
              <summary>
                {copy.unanswered} · {session.expiredQuestion.animal}
              </summary>
              <h3>{session.expiredQuestion.prompt}</h3>
              <p>
                <strong>{copy.correctAnswer} : </strong>
                {session.expiredQuestion.options[session.expiredQuestion.answer]}
              </p>
              <LearningNotes question={session.expiredQuestion} copy={copy} />
            </details>
          )}
          {session.answers.map((answer, answerIndex) => (
            <details key={answer.question.id} className="quiz-review">
              <summary>
                <span aria-hidden="true">{answer.correct ? '✓' : '↗'}</span> {answerIndex + 1}.{' '}
                {answer.question.animal} · {answer.correct ? copy.correctAnswer : copy.toDiscover}
              </summary>
              <h3>{answer.question.prompt}</h3>
              <p>
                {copy.yourAnswer} : {answer.question.options[answer.selected]}
              </p>
              {!answer.correct && (
                <p>
                  <strong>{copy.correctAnswer} : </strong>
                  {answer.question.options[answer.question.answer]}
                </p>
              )}
              <LearningNotes question={answer.question} copy={copy} />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
