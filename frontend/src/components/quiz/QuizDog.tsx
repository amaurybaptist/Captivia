import fr from '@/lib/quiz/locales/fr.json';
import type { QuizCopy } from '@/lib/quiz/i18n';

export default function QuizDog({
  mood,
  copy = fr,
}: {
  mood: 'happy' | 'sad' | 'waiting';
  copy?: QuizCopy;
}) {
  return (
    <svg
      className={`quiz-dog quiz-dog--${mood}`}
      viewBox="0 0 180 150"
      role="img"
      aria-label={mood === 'happy' ? copy.dogHappy : mood === 'sad' ? copy.dogSad : copy.dogWaiting}
    >
      <ellipse cx="90" cy="139" rx="57" ry="7" fill="currentColor" opacity=".09" />
      <g className="quiz-dog-body">
        <path
          className="quiz-dog-tail"
          d="M127 111 Q165 120 157 86"
          fill="none"
          stroke="#c48752"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <ellipse cx="98" cy="112" rx="37" ry="23" fill="#dda66d" />
        <rect x="66" y="115" width="18" height="23" rx="8" fill="#c48752" />
        <rect x="112" y="115" width="18" height="23" rx="8" fill="#c48752" />
        <g className="quiz-dog-head">
          <path className="quiz-dog-ear" d="M53 43 Q23 39 29 85 Q36 104 54 78" fill="#9d603c" />
          <path
            className="quiz-dog-ear"
            d="M116 43 Q148 39 140 86 Q133 104 115 78"
            fill="#9d603c"
          />
          <rect x="43" y="27" width="84" height="81" rx="37" fill="#edbb80" />
          <path d="M74 29 Q96 20 103 30 L97 68 L78 68Z" fill="#fff4df" />
          {mood === 'happy' ? (
            <g stroke="#3e2e2a" strokeWidth="4" fill="none" strokeLinecap="round">
              <path d="M60 65 Q66 57 72 65" />
              <path d="M99 65 Q105 57 111 65" />
            </g>
          ) : (
            <g fill="#3e2e2a">
              <circle cx="66" cy="63" r="4" />
              <circle cx="104" cy="63" r="4" />
            </g>
          )}
          <ellipse cx="85" cy="84" rx="24" ry="18" fill="#fff4df" />
          <path d="M78 76 Q85 72 92 76 Q91 84 85 85 Q79 83 78 76" fill="#3e2e2a" />
          {mood === 'sad' ? (
            <path
              d="M77 96 Q85 88 94 96"
              fill="none"
              stroke="#3e2e2a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : (
            <path d="M75 90 Q85 104 96 90" fill="#3e2e2a" />
          )}
          {mood === 'happy' && <path d="M81 95 L81 101 Q87 111 92 101 L92 95Z" fill="#ed8d95" />}
        </g>
        <path d="M57 104 Q84 116 116 104" stroke="#0a936d" strokeWidth="8" fill="none" />
        <circle cx="86" cy="111" r="7" fill="#efc95e" />
      </g>
      {mood === 'happy' && (
        <g className="quiz-dog-spark" fill="#e6b63a">
          <path d="M25 19 L28 27 L36 30 L28 33 L25 41 L22 33 L14 30 L22 27Z" />
          <path d="M148 20 L151 27 L158 30 L151 33 L148 40 L145 33 L138 30 L145 27Z" />
        </g>
      )}
    </svg>
  );
}
