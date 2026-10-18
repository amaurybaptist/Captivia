'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { getNotificationTimeZone, snoozeReminder } from '@/lib/push-notifications';

const BADGE_IMAGES: Record<string, string> = {
  bronze: '/badges/bronze.svg',
  silver: '/badges/silver.svg',
  gold: '/badges/gold.svg',
  platinum: '/badges/platinum.svg',
  diamond: '/badges/diamond.svg',
};

type GradeData = {
  points: number;
  grade: string;
  nextGrade: string | null;
  pointsInCurrent: number;
  pointsNeededForNext: number;
  progressPercent: number;
};

const DEFAULT_GRADE: GradeData = {
  points: 0,
  grade: 'bronze',
  nextGrade: 'silver',
  pointsInCurrent: 0,
  pointsNeededForNext: 500,
  progressPercent: 0,
};

type NotificationEvent = {
  id: string;
  type: string;
  label: string | null;
  scheduledAt: string;
  snoozedUntil?: string | null;
  status: string;
  pointsAwarded: number;
  routineId?: string;
};

export default function GradePage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [grade, setGrade] = useState<GradeData | null>(DEFAULT_GRADE);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [reminderTimeZone, setReminderTimeZone] = useState('Europe/Brussels');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [gradeRes, eventsRes, zone] = await Promise.all([
        api.getGrade(token),
        api.getNotificationEvents(token),
        getNotificationTimeZone(token),
      ]);
      setReminderTimeZone(zone);
      setGrade(gradeRes?.points != null ? gradeRes : null);
      setEvents(Array.isArray(eventsRes) ? eventsRes : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (user && token) void loadData(); }, [user, token, loadData]);


  const handleMark = async (eventId: string, status: 'done' | 'skipped') => {
    if (!token) return;
    setActionId(eventId);
    try {
      const res = await api.setNotificationEventStatus(eventId, status, token);
      if (res?.grade) setGrade(res.grade);
      if (res?.event) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, ...res.event } : e))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteReminder = async (eventId: string) => {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!authToken) return;
    setDeletingId(eventId);
    setGradeError(null);
    try {
      const res = await api.deleteNotificationEvent(eventId, authToken);
      if (res?.deleted !== false) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } else {
        setGradeError(t('grade.deleteError') || 'Impossible de supprimer le rappel.');
      }
    } catch (e) {
      console.error(e);
      setGradeError(e instanceof Error ? e.message : (t('grade.deleteError') || 'Impossible de supprimer le rappel.'));
    } finally {
      setDeletingId(null);
    }
  };

  const displayGrade = grade ?? DEFAULT_GRADE;
  const gradeLabelKey = displayGrade.grade ? `grade.${displayGrade.grade}` : '';
  const gradeLabel = gradeLabelKey ? t(gradeLabelKey) : displayGrade.grade;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sunken ">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4" />
          <p className="text-ink ">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sunken ">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <nav className="text-sm text-ink-2 mb-4">
          <Link href="/parametres" className="hover:text-accent">
            {t('settings.title')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink ">{t('grade.title')}</span>
        </nav>

        <Link href="/agenda" className="inline-flex mb-4 text-accent  underline">Ouvrir le calendrier des soins →</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink  mb-6">
          {t('grade.title')}
        </h1>

        {/* Statut actuel : grade + médaille + points — toujours affiché */}
        <div className="bg-surface  rounded-card shadow-none p-6 mb-6">
          <h2 className="text-lg font-semibold text-ink  mb-4">
            {t('grade.yourStatus')}
          </h2>
          {gradeError && (
            <p className="text-sm text-ink  mb-3">{gradeError}</p>
          )}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="shrink-0 relative w-28 h-28 flex items-center justify-center">
              <Image
                width={112}
                height={112}
                src={BADGE_IMAGES[displayGrade.grade] || BADGE_IMAGES.bronze}
                alt=""
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain absolute inset-0 m-auto"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.visibility = 'hidden';
                  const fallback = el.parentElement?.querySelector('.badge-fallback') as HTMLElement;
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <div
                className="badge-fallback hidden w-24 h-24 sm:w-28 sm:h-28 items-center justify-center rounded-full bg-sunken  text-4xl"
                aria-hidden
              >
                🏅
              </div>
            </div>
            <div className="flex-1 w-full min-w-0 text-center sm:text-left">
              <p className="text-2xl font-bold text-ink  capitalize flex items-center justify-center sm:justify-start gap-2">
                <Image
                width={112}
                height={112}
                  src={BADGE_IMAGES[displayGrade.grade] || BADGE_IMAGES.bronze}
                  alt=""
                  className="w-8 h-8 object-contain shrink-0"
                  aria-hidden
                />
                {gradeLabel}
              </p>
              <p className="text-lg text-accent  font-semibold mt-1">
                {displayGrade.points} {t('grade.points')}
              </p>
            </div>
          </div>

          {/* Barre d'évolution des points — progression verte visible quand on marque routine/notification comme fait */}
          <div className="mt-5 pt-4 border-t border-line ">
            {displayGrade.nextGrade ? (
              <>
                <p className="text-sm text-ink-2  mb-2">
                  {displayGrade.points} / {displayGrade.points - displayGrade.pointsInCurrent + displayGrade.pointsNeededForNext}{' '}
                  {t('grade.points')} → {t(`grade.${displayGrade.nextGrade}`)}
                </p>
                <div
                  className="w-full h-6 rounded-full overflow-hidden bg-sunken  border border-line "
                  role="progressbar"
                  aria-valuenow={displayGrade.points}
                  aria-valuemin={0}
                  aria-valuemax={displayGrade.points - displayGrade.pointsInCurrent + displayGrade.pointsNeededForNext}
                  aria-label={t('grade.progressBarLabel')}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out min-w-[12px] bg-accent   shadow-none"
                    style={{
                      width: `${Math.max(0, Math.min(100, displayGrade.progressPercent ?? 0))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-accent  mt-1.5 font-medium">
                  {Math.round(displayGrade.progressPercent ?? 0)}% {t('grade.progressToNext')}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-2  mb-2">
                  {displayGrade.points} {t('grade.points')} — {t(`grade.${displayGrade.grade}`)} max
                </p>
                <div
                  className="w-full h-6 rounded-full overflow-hidden bg-sunken  border border-line "
                  role="progressbar"
                  aria-valuenow={displayGrade.points}
                  aria-valuemin={0}
                  aria-valuemax={displayGrade.points}
                >
                  <div className="h-full w-full rounded-full bg-accent  " />
                </div>
                <p className="text-xs text-accent  mt-1.5 font-medium">
                  100% — {t('grade.maxGrade')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Rappels du jour — créés par routines et préférences notifications */}
        <div className="bg-surface  rounded-card shadow-none p-6">
          <h2 className="text-xl font-bold text-ink  mb-2">
            {t('grade.remindersToday')}
          </h2>
          <p className="text-sm text-ink-2  mb-4">
            {t('grade.routinesCreateReminders')}
          </p>
          {events.length === 0 ? (
            <p className="text-ink-2  text-sm">
              {t('grade.noReminders')}
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  id={`reminder-${ev.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-card border border-line  bg-sunken/50 "
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink ">
                      {ev.label || ev.type}
                    </p>
                    <p className="text-sm text-ink-2 ">
                      {new Date(ev.snoozedUntil || ev.scheduledAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: reminderTimeZone,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {ev.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={actionId === ev.id}
                          onClick={() => handleMark(ev.id, 'done')}
                          className="px-4 py-2 bg-accent text-on-accent rounded-card hover:bg-accent disabled:opacity-50 text-sm font-medium"
                        >
                          {ev.routineId
                            ? t('grade.markDoneRoutine')
                            : t('grade.markDoneNotification')}
                        </button>
                        <button type="button" disabled={actionId === ev.id}
                          onClick={async () => {
                            if (!token) return;
                            setActionId(ev.id); setGradeError(null);
                            try {
                              const updated = await snoozeReminder(token, ev.id);
                              setEvents(prev => prev.map(item => item.id === ev.id ? { ...item, ...updated } : item));
                            } catch { setGradeError(t('notifications.reminderError')); }
                            finally { setActionId(null); }
                          }}
                          className="px-4 py-2 border rounded-card  disabled:opacity-50">
                          {t('notifications.snoozeAction')}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === ev.id}
                          onClick={() => handleMark(ev.id, 'skipped')}
                          className="px-4 py-2 border border-line  rounded-card hover:bg-sunken  text-sm"
                        >
                          {t('grade.markSkipped')}
                        </button>
                      </>
                    ) : (
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${
                          ev.status === 'done'
                            ? 'bg-accent-soft  text-accent '
                            : 'bg-sunken  text-ink '
                        }`}
                      >
                      {ev.status === 'done'
                        ? (ev.pointsAwarded
                            ? `${t('grade.done')} (+${ev.pointsAwarded} pts)`
                            : t('grade.done'))
                        : t('grade.skipped')}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === ev.id}
                      onClick={() => handleDeleteReminder(ev.id)}
                      className="p-2 text-ink-2 hover:text-danger hover:bg-danger-soft  rounded-card transition-colors"
                      title={t('grade.deleteReminder')}
                      aria-label={t('grade.deleteReminder')}
                    >
                      {deletingId === ev.id ? (
                        <span className="inline-block w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/parametres"
            className="inline-flex items-center text-accent  hover:underline"
          >
            ← {t('settings.title')}
          </Link>
        </div>
      </div>
    </div>
  );
}
