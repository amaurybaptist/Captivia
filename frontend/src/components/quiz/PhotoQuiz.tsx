'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, Eye, Lightbulb, Maximize2, Trophy, X } from 'lucide-react';
import type { QuizCopy } from '@/lib/quiz/i18n';
import { format } from '@/lib/quiz/i18n';
import type { Difficulty, QuizLocale } from '@/lib/quiz/types';
import type { PhotoCopy } from '@/lib/quiz/photo/i18n';
import type { PhotoQuestion } from '@/lib/quiz/photo/types';
import {
  loadPhotoRound,
  PHOTO_LEVEL_COUNTS,
  PHOTO_ROUND_LENGTH,
  readPhotoRecord,
  savePhotoRecord,
} from '@/lib/quiz/photo/catalog';
import QuizDog from './QuizDog';
import './quiz.css';

type PhotoAnswer = { question: PhotoQuestion; selected: number };
type PhotoSession = {
  difficulty: Difficulty;
  questions: PhotoQuestion[];
  index: number;
  selected: number | null;
  answers: PhotoAnswer[];
  finished: boolean;
};
const scoreOf = (answers: PhotoAnswer[]) =>
  answers.filter((a) => a.selected === a.question.answer).length;

function Notes({
  question,
  copy,
  photo,
}: {
  question: PhotoQuestion;
  copy: QuizCopy;
  photo: PhotoCopy;
}) {
  return (
    <div className="quiz-learning">
      <div>
        <h3>{photo.recognition}</h3>
        <p>{question.recognition}</p>
      </div>
      <aside className="quiz-fact">
        <h3>
          <Lightbulb size={18} aria-hidden="true" /> {copy.didYouKnow}
        </h3>
        <p>{question.didYouKnow}</p>
      </aside>
      <a
        href={question.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="quiz-source"
      >
        {photo.source} <span className="quiz-sr-only">({photo.sourceNote})</span> ↗
      </a>
    </div>
  );
}

function Challenge({
  question,
  selected,
  copy,
  photo,
  onAnswer,
}: {
  question: PhotoQuestion;
  selected: number | null;
  copy: QuizCopy;
  photo: PhotoCopy;
  onAnswer: (selected: number) => void;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const revealed = selected !== null;
  const src = question.image.src + (retry ? `?photoRetry=${retry}` : '');
  return (
    <>
      <figure className="quiz-photo photo-challenge">
        <div className="photo-challenge-frame">
          <Image
            key={retry}
            src={src}
            alt={revealed ? question.animal : photo.imageAlt}
            fill
            sizes="(max-width: 600px) calc(100vw - 70px), 880px"
            unoptimized
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
          />
        </div>
        {status === 'loading' && <p role="status">{photo.imageLoading}</p>}
        {status === 'error' && (
          <div role="alert">
            <p>{photo.imageError}</p>
            <button
              type="button"
              className="quiz-secondary"
              onClick={() => {
                setStatus('loading');
                setRetry((value) => value + 1);
              }}
            >
              {photo.retryImage}
            </button>
          </div>
        )}
        {status === 'ready' && (
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button type="button" className="quiz-text-button photo-zoom-trigger">
                <Maximize2 size={16} aria-hidden="true" />
                {photo.imageZoom}
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="photo-zoom-overlay" />
              <Dialog.Content className="photo-zoom-dialog">
                <Dialog.Title>{photo.imageZoom}</Dialog.Title>
                <Dialog.Description className="quiz-sr-only">{photo.imageAlt}</Dialog.Description>
                <div className="photo-zoom-frame">
                  <Image
                    src={src}
                    alt={revealed ? question.animal : photo.imageAlt}
                    fill
                    sizes="94vw"
                    unoptimized
                  />
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="photo-zoom-close" aria-label={photo.imageClose}>
                    <X aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
        <figcaption>
          <span>
            {copy.image} : {question.image.creator} ·{' '}
            <a href={question.image.licenseUrl} target="_blank" rel="noopener noreferrer">
              {question.image.licenseName}
            </a>
          </span>
          {revealed ? (
            <>
              <strong>{question.animal}</strong>
              <span>
                <i>{question.scientificName}</i>
              </span>
              <details className="quiz-photo-credit">
                <summary>{copy.imageCredits}</summary>
                <p>
                  {question.image.title} — {question.image.creator}.{' '}
                  <a href={question.image.sourcePage} target="_blank" rel="noopener noreferrer">
                    {copy.imageOriginal}
                  </a>
                  . {copy.imageResize}
                </p>
              </details>
            </>
          ) : (
            <small>{photo.creditsLater}</small>
          )}
        </figcaption>
      </figure>
      <div className="quiz-options" role="group" aria-label={copy.possibleAnswers}>
        {question.options.map((option, index) => {
          const correct = revealed && index === question.answer;
          const wrong = revealed && selected === index && !correct;
          return (
            <button
              type="button"
              key={option.id}
              disabled={revealed || status !== 'ready'}
              className={`quiz-option${correct ? ' is-correct' : wrong ? ' is-incorrect' : ''}`}
              onClick={() => onAnswer(index)}
            >
              <span className="quiz-option-letter" aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span>
                {option.label}
                {(correct || wrong) && (
                  <small>{correct ? copy.correctAnswer : copy.yourAnswer}</small>
                )}
              </span>
              {correct ? (
                <Check size={21} aria-hidden="true" />
              ) : wrong ? (
                <X size={21} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function PhotoQuiz({
  locale,
  copy,
  photo,
}: {
  locale: QuizLocale;
  copy: QuizCopy;
  photo: PhotoCopy;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [session, setSession] = useState<PhotoSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [record, setRecord] = useState<number | null>(null);
  const [saved, setSaved] = useState(true);
  const request = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const question = session?.questions[session.index];
  const revealed = session?.selected !== null && session?.selected !== undefined;
  const score = session ? scoreOf(session.answers) : 0;
  useEffect(() => {
    setRecord(readPhotoRecord(difficulty));
  }, [difficulty]);
  useEffect(() => {
    (revealed && !session?.finished ? feedback : heading).current?.focus();
  }, [revealed, session?.index, session?.finished]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  async function begin() {
    const version = ++request.current;
    setLoading(true);
    setError(false);
    try {
      const questions = await loadPhotoRound(locale, difficulty);
      if (version !== request.current) return;
      setSession({ difficulty, questions, index: 0, selected: null, answers: [], finished: false });
      setSaved(true);
    } catch {
      if (version === request.current) setError(true);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }
  function answer(selected: number) {
    setSession((current) => {
      if (
        !current ||
        current.selected !== null ||
        current.finished ||
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected > 3
      )
        return current;
      return {
        ...current,
        selected,
        answers: [...current.answers, { question: current.questions[current.index], selected }],
      };
    });
  }
  function next() {
    if (!session || session.selected === null || session.finished) return;
    if (session.index === session.questions.length - 1) {
      const result = savePhotoRecord(session.difficulty, score);
      setRecord(result.best);
      setSaved(result.saved);
      setSession((current) => (current ? { ...current, finished: true } : current));
    } else
      setSession((current) =>
        current && current.selected !== null && !current.finished
          ? { ...current, index: current.index + 1, selected: null }
          : current,
      );
  }
  return (
    <section className="quiz-page photo-game" lang={locale} aria-label={photo.photoTitle}>
      <header className="quiz-intro">
        <span className="quiz-eyebrow">
          <Eye size={18} aria-hidden="true" />
          {photo.eyebrow}
        </span>
        <h1>{photo.title}</h1>
        <p>{photo.intro}</p>
      </header>
      {!session ? (
        <>
          <div className="quiz-setup-head">
            <div>
              <h2>{copy.choose}</h2>
              <p>{photo.bank}</p>
            </div>
            <QuizDog mood="waiting" copy={copy} />
          </div>
          <fieldset className="quiz-difficulties">
            <legend>{copy.difficulty}</legend>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <button
                type="button"
                key={level}
                aria-pressed={difficulty === level}
                disabled={loading}
                onClick={() => setDifficulty(level)}
              >
                <strong>{copy[level]}</strong>
                <small>{photo[`${level}Description`]}</small>
                <small>
                  {photo.available.replace('{count}', String(PHOTO_LEVEL_COUNTS[level]))}
                </small>
              </button>
            ))}
          </fieldset>
          <div className="quiz-start-panel">
            <p>{photo.rules}</p>
            <p>{photo.factNote}</p>
            {record !== null && (
              <p className="quiz-record">
                <Trophy size={17} aria-hidden="true" />
                {format(copy, 'record', { score: record })} / {PHOTO_ROUND_LENGTH}
              </p>
            )}
            {error && (
              <p role="alert" className="quiz-error">
                {photo.loadError}
              </p>
            )}
            <button
              type="button"
              disabled={loading}
              className="quiz-primary"
              onClick={() => void begin()}
            >
              {loading ? photo.loading : copy.start}
              <ArrowRight size={19} aria-hidden="true" />
            </button>
            <small>{photo.practice}</small>
          </div>
        </>
      ) : session.finished ? (
        <div className="quiz-results">
          <div className="quiz-result-hero">
            <QuizDog mood="happy" copy={copy} />
            <span className="quiz-eyebrow">
              {photo.photoTitle} · {copy[session.difficulty]}
            </span>
            <h2 ref={heading} tabIndex={-1}>
              {photo.complete}
            </h2>
            <p className="quiz-result-score">
              {score}
              <span> / {PHOTO_ROUND_LENGTH}</span>
            </p>
            <p>{format(copy, 'scoreSummary', { score, count: session.answers.length })}</p>
            <p>
              {saved ? format(copy, 'record', { score: record ?? 0 }) : copy.storageUnavailable}
            </p>
            <div className="quiz-result-actions">
              <button
                type="button"
                className="quiz-primary"
                disabled={loading}
                onClick={() => void begin()}
              >
                {loading ? photo.loading : copy.replay}
              </button>
              <button
                type="button"
                className="quiz-secondary"
                disabled={loading}
                onClick={() => {
                  setSession(null);
                  setError(false);
                }}
              >
                {photo.back}
              </button>
            </div>
            {error && <p role="alert">{photo.loadError}</p>}
          </div>
          <h2>{photo.review}</h2>
          {session.answers.map(({ question, selected }, i) => (
            <details className="quiz-review" key={question.id}>
              <summary>
                {selected === question.answer ? '✓' : '↗'} {i + 1}. {question.animal}
              </summary>
              <p>
                {copy.yourAnswer} : {question.options[selected].label}
              </p>
              <p>
                <strong>
                  {copy.correctAnswer} : {question.animal}
                </strong>{' '}
                · <i>{question.scientificName}</i>
              </p>
              <Notes question={question} copy={copy} photo={photo} />
            </details>
          ))}
        </div>
      ) : question ? (
        <div className="quiz-play">
          <div className="quiz-play-toolbar">
            <button type="button" className="quiz-text-button" onClick={() => setSession(null)}>
              <ArrowLeft size={17} aria-hidden="true" />
              {photo.back}
            </button>
            <span>{copy[session.difficulty]}</span>
            <span className="quiz-score">
              <Trophy size={16} aria-hidden="true" />
              {score}
            </span>
          </div>
          <div className="quiz-progress-line">
            {format(copy, 'progress', {
              current: session.index + 1,
              total: session.questions.length,
            })}
          </div>
          <progress
            aria-label={copy.progressLabel}
            max={session.questions.length}
            value={session.answers.length}
          />
          <article className="quiz-question-card">
            <h2 ref={heading} tabIndex={-1}>
              {photo.question}
            </h2>
            <Challenge
              key={question.id}
              question={question}
              selected={session.selected}
              copy={copy}
              photo={photo}
              onAnswer={answer}
            />
          </article>
          {revealed && (
            <section className="quiz-feedback" aria-label={copy.feedbackLabel}>
              <div className="quiz-feedback-heading" role="status">
                <QuizDog
                  mood={session.selected === question.answer ? 'happy' : 'sad'}
                  copy={copy}
                />
                <div>
                  <h2 ref={feedback} tabIndex={-1}>
                    {session.selected === question.answer ? copy.success : copy.incorrect}
                  </h2>
                  <p>
                    <strong>{question.animal}</strong> · <i>{question.scientificName}</i>
                  </p>
                </div>
              </div>
              <Notes question={question} copy={copy} photo={photo} />
              <button type="button" className="quiz-primary" onClick={next}>
                {session.index === session.questions.length - 1 ? copy.result : copy.next}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </section>
          )}
        </div>
      ) : null}
    </section>
  );
}
