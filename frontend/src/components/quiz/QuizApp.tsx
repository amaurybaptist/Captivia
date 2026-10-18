'use client';
import { useState } from 'react';
import { Camera, Lightbulb } from 'lucide-react';
import PhotoQuiz from './PhotoQuiz';
import type { PhotoCopy } from '@/lib/quiz/photo/i18n';
import { useAuth } from '@/contexts/AuthContext';
import type { QuizCopy } from '@/lib/quiz/i18n';
import type { QuizLocale } from '@/lib/quiz/types';
import AnimalQuiz from './AnimalQuiz';

export default function QuizApp({
  locale,
  copy,
  photo,
}: {
  locale: QuizLocale;
  copy: QuizCopy;
  photo: PhotoCopy;
}) {
  const [game, setGame] = useState<'knowledge' | 'photo'>('knowledge');
  const { user, token } = useAuth();
  return (
    <>
      <nav className="quiz-game-picker" aria-label={photo.games}>
        <button
          type="button"
          aria-pressed={game === 'knowledge'}
          onClick={() => setGame('knowledge')}
        >
          <Lightbulb size={25} aria-hidden="true" />
          <span>
            <strong>{photo.knowledgeTitle}</strong>
            <small>{photo.knowledgeDescription}</small>
          </span>
        </button>
        <button type="button" aria-pressed={game === 'photo'} onClick={() => setGame('photo')}>
          <Camera size={25} aria-hidden="true" />
          <span>
            <strong>{photo.photoTitle}</strong>
            <small>{photo.photoDescription}</small>
          </span>
        </button>
      </nav>
      {game === 'photo' ? (
        <PhotoQuiz key={locale} locale={locale} copy={copy} photo={photo} />
      ) : (
        <AnimalQuiz
          key={`${locale}:${user?.id ?? 'guest'}`}
          locale={locale}
          copy={copy}
          account={user && token ? { id: user.id, token } : null}
        />
      )}
    </>
  );
}
