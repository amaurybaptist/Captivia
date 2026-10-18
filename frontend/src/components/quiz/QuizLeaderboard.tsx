'use client';
import { useEffect, useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import type { QuizSettings } from '@/lib/quiz/types';
import { format, type QuizCopy } from '@/lib/quiz/i18n';
import { loadLeaderboard, type Leaderboard } from '@/lib/quiz/online';

export default function QuizLeaderboard({
  settings,
  copy,
}: {
  settings: QuizSettings;
  copy: QuizCopy;
}) {
  const { category, difficulty } = settings;
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [data, setData] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (scope !== 'global') return;
    let active = true;
    const controller = new AbortController();
    void loadLeaderboard({ category, difficulty }, controller.signal)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [category, difficulty, scope, retry]); // only ranked filters affect the table
  return (
    <section className="quiz-leaderboard" aria-label={copy.leaderboard}>
      <h2>
        <Trophy size={23} aria-hidden="true" /> {copy.leaderboard}
      </h2>
      <div className="quiz-ranking-tabs" role="group" aria-label={copy.rankingTabLabel}>
        <button
          type="button"
          aria-pressed={scope === 'global'}
          onClick={() => {
            setData(null);
            setFailed(false);
            setScope('global');
          }}
        >
          <Trophy size={17} aria-hidden="true" />
          {copy.global}
        </button>
        <button
          type="button"
          aria-pressed={scope === 'friends'}
          onClick={() => {
            setData(null);
            setFailed(false);
            setScope('friends');
          }}
        >
          <Users size={17} aria-hidden="true" />
          {copy.friends}
        </button>
      </div>
      {scope === 'friends' ? (
        <div className="quiz-ranking-message">
          <strong>{copy.comingSoon}</strong>
          <p>{copy.friendsUpcoming}</p>
        </div>
      ) : (
        <>
          <p>{copy.globalUpcoming}</p>
          {failed ? (
            <div role="status">
              <p>{copy.rankedUnavailable}</p>
              <button
                type="button"
                className="quiz-secondary"
                onClick={() => {
                  setData(null);
                  setFailed(false);
                  setRetry((n) => n + 1);
                }}
              >
                {copy.retry}
              </button>
            </div>
          ) : !data ? (
            <p role="status">{copy.rankingLoading}</p>
          ) : data.entries.length === 0 ? (
            <p>{copy.rankingNoData}</p>
          ) : (
            <>
              <p>{format(copy, 'players', { count: data.totalPlayers })}</p>
              <p>{copy.rankingTop}</p>
              <div className="quiz-ranking-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{copy.rank}</th>
                      <th scope="col">{copy.player}</th>
                      <th scope="col">{copy.score}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((row) => (
                      <tr key={row.alias}>
                        <td>{row.rank}</td>
                        <td>{row.alias}</td>
                        <td>
                          {row.score} / {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <small>{copy.rankingAlias}</small>
        </>
      )}
      <p className="quiz-ranking-rules">{copy.rankingRules}</p>
    </section>
  );
}
