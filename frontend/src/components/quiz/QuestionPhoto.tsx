import fr from '@/lib/quiz/locales/fr.json';
import type { QuizCopy } from '@/lib/quiz/i18n';
import { useState } from 'react';
import Image from 'next/image';
import type { QuestionImage } from '@/lib/quiz/types';

export default function QuestionPhoto({
  image,
  copy = fr,
  revealName = false,
}: {
  image: QuestionImage;
  copy?: QuizCopy;
  revealName?: boolean;
}) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <figure className="quiz-photo">
      {unavailable ? (
        <div className="quiz-photo-unavailable" role="status">
          {copy.photoUnavailable}
        </div>
      ) : (
        <div className="quiz-photo-frame">
          <Image
            src={image.src}
            alt={revealName ? image.caption : copy.photoAlt}
            fill
            sizes="(max-width: 520px) calc(100vw - 74px), (max-width: 900px) 85vw, 748px"
            unoptimized
            onError={() => setUnavailable(true)}
          />
        </div>
      )}
      <figcaption>
        {revealName && <span className="quiz-photo-caption">{image.caption}</span>}
        <span>
          {copy.image} :{' '}
          <a href={image.sourcePage} target="_blank" rel="noopener noreferrer">
            {image.creator}
            <span className="quiz-sr-only">
              , {copy.imageSource} ({copy.newTab})
            </span>
          </a>{' '}
          ·{' '}
          <a href={image.licenseUrl} target="_blank" rel="noopener noreferrer">
            {image.licenseName}
            <span className="quiz-sr-only"> ({copy.newTab})</span>
          </a>
        </span>
        {image.title && (
          <details className="quiz-photo-credit">
            <summary>{copy.imageCredits}</summary>
            <p>
              {image.title} — {image.creator} — {image.licenseName}.{' '}
              <a href={image.sourcePage} target="_blank" rel="noopener noreferrer">
                {copy.imageOriginal}
              </a>
              . {copy.imageResize}
            </p>
          </details>
        )}
      </figcaption>
    </figure>
  );
}
