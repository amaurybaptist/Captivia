'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { disablePush, enablePush, getNotificationCapabilities, hasActivePushSubscription, notificationCalendar, supportsPush, testNotification, type NotificationCapabilities } from '@/lib/push-notifications';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

/** Fréquences de répétition */
export type RecurrenceKind =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'weekly'
  | 'monthly'
  | 'once'
  | 'hourly';

/** Configuration horaire par type de notification */
export type TypeSchedule = {
  startDate?: string; // ancrage local de la récurrence
  time: string; // HH:mm
  recurrence: RecurrenceKind;
  date?: string; // YYYY-MM-DD si recurrence === 'once'
  weekDay?: number; // 0=dimanche .. 6=samedi si recurrence === 'weekly'
  dayOfMonth?: number; // 1-31 si recurrence === 'monthly'
  intervalHours?: number; // 1-24 si recurrence === 'hourly'
};

interface NotificationPreferences {
  types: Record<string, boolean>;
  typeSchedules: Record<string, TypeSchedule>;
  schedule: { start: string; end: string };
  snooze: number;
  timeZone: string;
  deliveryChannel: 'push' | 'email' | 'both';
}
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const DEFAULT_TYPE_SCHEDULE: TypeSchedule = {
  time: '08:00',
  recurrence: 'daily',
};

const RECURRENCE_OPTIONS: { value: RecurrenceKind; labelKey: string }[] = [
  { value: 'hourly', labelKey: 'notifications.recurrenceHourly' },
  { value: 'daily', labelKey: 'notifications.recurrenceDaily' },
  { value: 'every_2_days', labelKey: 'notifications.recurrenceEvery2Days' },
  { value: 'every_3_days', labelKey: 'notifications.recurrenceEvery3Days' },
  { value: 'weekly', labelKey: 'notifications.recurrenceWeekly' },
  { value: 'monthly', labelKey: 'notifications.recurrenceMonthly' },
  { value: 'once', labelKey: 'notifications.recurrenceOnce' },
];

/** Sujets suggérés pour guider l'utilisateur (il peut aussi créer les siens) */
const SUGGESTED_NOTIFICATION_TYPES = [
  'Nourrissage',
  'Nettoyage',
  'UVB / éclairage',
  'Santé',
  'Rappel vétérinaire',
  'Mue',
  'Pondération',
  'Bain',
  'Température',
  'Humidité',
] as const;

const getApiBase = () =>
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3001';

  const defaultSchedule = { start: '00:00', end: '23:59' };

  /** Anciennes clés API → libellés affichés (évite doublons avec les suggestions) */
  const LEGACY_TYPE_KEYS: Record<string, string> = {
    nourrissage: 'Nourrissage',
    nettoyage: 'Nettoyage',
    entretien: 'Nettoyage',
    controle: 'Santé',
    uvb: 'UVB / éclairage',
    sante: 'Santé',
  };

const normalizePreferences = (data: unknown): NotificationPreferences | null => {
    if (!isRecord(data)) return null;
    const types = isRecord(data.types) ? data.types : {};
    const normalized: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(types)) {
      const label = LEGACY_TYPE_KEYS[key] ?? key;
      if (typeof value === 'boolean') normalized[label] = value;
    }
    const typeSchedules = isRecord(data.typeSchedules) ? data.typeSchedules : {};
    const normalizedSchedules: Record<string, TypeSchedule> = {};
    const validRecurrence = (r: unknown): RecurrenceKind => {
      const allowed: RecurrenceKind[] = ['daily', 'every_2_days', 'every_3_days', 'weekly', 'monthly', 'once', 'hourly'];
      return allowed.includes(r as RecurrenceKind) ? (r as RecurrenceKind) : 'daily';
    };
    for (const [key, val] of Object.entries(typeSchedules)) {
      const v = val;
      if (isRecord(v) && typeof v.time === 'string') {
        const rec = validRecurrence(v.recurrence);
        normalizedSchedules[LEGACY_TYPE_KEYS[key] ?? key] = {
          startDate: typeof v.startDate === 'string' ? v.startDate : undefined,
          time: v.time || '08:00',
          recurrence: rec,
          date: rec === 'once' && typeof v.date === 'string' ? v.date : undefined,
          weekDay: rec === 'weekly' && typeof v.weekDay === 'number' ? v.weekDay : undefined,
          dayOfMonth: rec === 'monthly' && typeof v.dayOfMonth === 'number' ? v.dayOfMonth : undefined,
          intervalHours: rec === 'hourly' && typeof v.intervalHours === 'number' ? Math.max(1, Math.min(24, v.intervalHours)) : undefined,
        };
      }
    }
    for (const typeKey of Object.keys(normalized)) {
      if (normalizedSchedules[typeKey] === undefined) {
        normalizedSchedules[typeKey] = { ...DEFAULT_TYPE_SCHEDULE };
      }
    }
    const deliveryChannel = data.deliveryChannel === 'email' || data.deliveryChannel === 'both' ? data.deliveryChannel : 'push';
    return {
      ...data,
      types: normalized,
      typeSchedules: normalizedSchedules,
      schedule: isRecord(data.schedule) && typeof data.schedule.start === 'string' && typeof data.schedule.end === 'string' ? { start: data.schedule.start, end: data.schedule.end } : defaultSchedule,
      snooze: typeof data.snooze === 'number' ? data.snooze : 15,
      deliveryChannel,
      timeZone: typeof data.timeZone === 'string' ? data.timeZone : 'Europe/Brussels',
    };
  };


export default function NotificationsPreferencesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [capabilities, setCapabilities] = useState<NotificationCapabilities | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  /** Nouveau sujet en cours de saisie (personnalisation) */
  const [newTypeLabel, setNewTypeLabel] = useState('');
  /** Édition du libellé : type en cours d’édition => valeur du champ */
  const [editingType, setEditingType] = useState<{ key: string; value: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'my-notifications'>('config');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);



  const fetchPreferences = useCallback(async () => {
    const authToken = (token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null))?.trim();
    if (!authToken) return;

    try {
      const response = await fetch(
        `${getApiBase()}/users/me/notification-preferences`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      if (response.status === 401) {
        setSaveError(true);
        setSaveMessage('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      if (!response.ok) throw new Error('Chargement impossible');
      const data = await response.json();
      setPreferences(normalizePreferences(data));
    } catch (error) {
      setSaveError(true);
      setSaveMessage('Impossible de charger les préférences. Réessayez dans un instant.');
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const checkSubscription = useCallback(async (publicKey?: string) => {
    setPushSupported(supportsPush());
    try { setSubscribed(token ? await hasActivePushSubscription(token, publicKey) : false); }
    catch { setSubscribed(false); }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      void fetchPreferences();
      getNotificationCapabilities(token).then(async caps => { setCapabilities(caps); await checkSubscription(caps.publicKey || undefined); }).catch(async () => { setCapabilities(null); await checkSubscription(); });
    }
  }, [user, token, fetchPreferences, checkSubscription]);


  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);
    await handleSavePreferencesBackend(preferences);
    setSaving(false);
  };

  const autoSavePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    void handleSavePreferencesBackend(newPreferences);
  };

  const handleSavePreferencesBackend = async (prefsToSave: NotificationPreferences) => {
    const authToken = (token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null))?.trim();
    if (!authToken) return;

    const payload = {
      types: prefsToSave?.types ?? {},
      typeSchedules: prefsToSave?.typeSchedules ?? {},
      schedule: prefsToSave?.schedule ?? { start: '08:00', end: '22:00' },
      snooze: typeof prefsToSave?.snooze === 'number' ? prefsToSave.snooze : 15,
      deliveryChannel: prefsToSave?.deliveryChannel ?? 'push',
      timeZone: prefsToSave?.timeZone || 'Europe/Brussels',
    };

    saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
    try {
      const response = await fetch(
        `${getApiBase()}/users/me/notification-preferences`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'Session expirée. Reconnectez-vous.' : (typeof data.message === 'string' ? data.message : 'Erreur lors de l’enregistrement'));
      setSaveError(false);
      setSaveMessage('Préférences enregistrées ✓');
    } catch (error) {
      setSaveError(true);
      setSaveMessage(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement');
      throw error;
    }
    });
    // Les composants affichent l’erreur; la file brute reste rejetée pour empêcher un test sur des préférences non enregistrées.
    return saveQueue.current.catch(() => {});
  };

  const updateType = (type: string, enabled: boolean) => {
    if (!preferences) return;
    const newPreferences = {
      ...preferences,
      types: {
        ...(preferences.types ?? {}),
        [type]: enabled,
      },
    };
    setPreferences(newPreferences);
    handleSavePreferencesBackend(newPreferences);
  };

  const addType = (label: string) => {
    if (!preferences) return;
    const trimmed = label.trim();
    if (!trimmed || (preferences?.types ?? {})[trimmed] !== undefined) return;
    const schedules = { ...(preferences?.typeSchedules ?? {}) };
    schedules[trimmed] = { ...DEFAULT_TYPE_SCHEDULE };
    const newPreferences = {
      ...preferences,
      types: { ...(preferences?.types ?? {}), [trimmed]: true },
      typeSchedules: schedules,
    };
    autoSavePreferences(newPreferences);
    setNewTypeLabel('');
  };

  const removeType = (type: string) => {
    if (!preferences) return;
    const types = { ...(preferences?.types ?? {}) };
    const typeSchedules = { ...(preferences?.typeSchedules ?? {}) };
    delete types[type];
    delete typeSchedules[type];
    autoSavePreferences({ ...preferences, types, typeSchedules });
    if (editingType?.key === type) setEditingType(null);
  };

  const updateTypeSchedule = (
    type: string,
    patch: Partial<TypeSchedule> | ((prev: TypeSchedule) => TypeSchedule),
  ) => {
    if (!preferences) return;
    const current = (preferences?.typeSchedules ?? {})[type] ?? DEFAULT_TYPE_SCHEDULE;
    const next =
      typeof patch === 'function' ? patch(current) : { ...current, ...patch };
    const typeSchedules = {
      ...(preferences?.typeSchedules ?? {}),
      [type]: next,
    };
    autoSavePreferences({ ...preferences, typeSchedules });
  };

  const startEditType = (key: string) => {
    setEditingType({ key, value: key });
  };

  const saveEditType = () => {
    if (!editingType || !preferences) return;
    const newKey = editingType.value.trim();
    const types = preferences?.types ?? {};
    const typeSchedules = { ...(preferences?.typeSchedules ?? {}) };
    if (!newKey || newKey === editingType.key) {
      setEditingType(null);
      return;
    }
    if (types[newKey] !== undefined && newKey !== editingType.key) {
      setEditingType(null);
      return;
    }
    const newTypes = { ...types };
    newTypes[newKey] = newTypes[editingType.key];
    delete newTypes[editingType.key];
    if (typeSchedules[editingType.key]) {
      typeSchedules[newKey] = typeSchedules[editingType.key];
      delete typeSchedules[editingType.key];
    }
    autoSavePreferences({ ...preferences, types: newTypes, typeSchedules });
    setEditingType(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sunken ">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mb-4"></div>
          <p className="text-ink ">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sunken ">
      {/* Breadcrumb */}
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 min-w-0">
        <nav className="text-sm text-ink-2">
          <Link href="/parametres" className="hover:text-accent">
            {t('settings.title')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink ">{t('notifications.title')}</span>
        </nav>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink  mb-2">
          {t('notifications.title')}
        </h1>
        <p className="text-ink  mb-4">
          {t('notifications.description')}
        </p>

        {saveMessage && <p role={saveError ? 'alert' : 'status'} className={`mb-4 p-3 rounded-card ${saveError ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent'}`}>{saveMessage}</p>}

        {/* Tabs: Configurer | Mes notifications */}
        <div className="flex gap-2 mb-6 border-b border-line ">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'config'
                ? 'bg-surface  text-accent border border-b-0 border-line  -mb-px'
                : 'text-ink  hover:text-ink '
            }`}
          >
            {t('notifications.tabConfig')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-notifications')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'my-notifications'
                ? 'bg-surface  text-accent border border-b-0 border-line  -mb-px'
                : 'text-ink  hover:text-ink '
            }`}
          >
            {t('notifications.tabMyNotifications')}
          </button>
        </div>

        <div className="space-y-6">
          {/* Tab: Mes notifications — liste des notifications enregistrées */}
          {activeTab === 'my-notifications' && preferences && (
            <div className="bg-surface  rounded-card shadow-none p-6">
              <h2 className="text-xl font-bold mb-4 text-ink ">
                {t('notifications.tabMyNotifications')}
              </h2>
              <p className="text-sm text-ink-2  mb-4">
                {t('notifications.myNotificationsDescription')}
              </p>
              {Object.entries(preferences.types ?? {}).length === 0 ? (
                <p className="text-ink-2  py-4">
                  {t('notifications.noNotificationsSaved')}
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(preferences.types ?? {}).map(([type, enabled]) => {
                    const schedule: TypeSchedule =
                      (preferences.typeSchedules ?? {})[type] ?? DEFAULT_TYPE_SCHEDULE;
                    const recurrenceLabel =
                      RECURRENCE_OPTIONS.find((o) => o.value === schedule.recurrence)?.labelKey ||
                      schedule.recurrence;
                    return (
                      <div
                        key={type}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-card border border-line  bg-sunken/50 "
                      >
                        <div>
                          <p className="font-medium text-ink ">{type}</p>
                          <p className="text-sm text-ink-2 ">
                            {t('notifications.time')} {schedule.time} · {t(recurrenceLabel)}
                            {schedule.recurrence === 'weekly' && schedule.weekDay != null && (
                              <> · {t(`notifications.weekDay${schedule.weekDay}`)}</>
                            )}
                            {schedule.recurrence === 'once' && schedule.date && (
                              <> · {schedule.date}</>
                            )}
                          </p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                              enabled
                                ? 'bg-accent-soft  text-accent '
                                : 'bg-sunken  text-ink '
                            }`}
                          >
                            {enabled ? t('notifications.enabled') : t('notifications.disabled')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingType({ key: type, value: type });
                              setActiveTab('config');
                            }}
                            className="px-3 py-1.5 text-sm bg-accent text-on-accent rounded-card hover:bg-accent"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeType(type)}
                            className="px-3 py-1.5 text-sm border border-danger  text-danger  rounded-card hover:bg-danger-soft "
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Configurer — contenu actuel */}
          {activeTab === 'config' && (
            <>
          {/* Enable Notifications */}
          <div className="bg-surface  rounded-card shadow-none p-6">
            <h2 className="text-xl font-bold mb-4 text-ink ">
              {t('notifications.enable')}
            </h2>
            <p className="mb-3 text-sm text-ink ">
              {!pushSupported ? t('notifications.pushUnsupported') : !capabilities?.push ? t('notifications.pushUnavailable') : subscribed ? t('notifications.pushEnabled') : t('notifications.enableBrowser')}
            </p>
            <button type="button" disabled={pushBusy || !pushSupported || (!subscribed && !capabilities?.push)}
              onClick={async () => {
                if (!token || (!subscribed && !capabilities?.publicKey)) return;
                setPushBusy(true); setSaveMessage(null);
                try {
                  if (subscribed) await disablePush(token); else await enablePush(token, capabilities!.publicKey!);
                } catch (error) { setSaveError(true); setSaveMessage(error instanceof Error ? error.message : t('notifications.testFailed')); }
                finally { await checkSubscription(capabilities?.publicKey || undefined); setPushBusy(false); }
              }}
              className="px-5 py-3 bg-accent text-on-accent rounded-card disabled:opacity-50">
              {subscribed ? t('notifications.disablePush') : t('notifications.enablePush')}
            </button>
            <button type="button" disabled={pushBusy || !capabilities || (preferences?.deliveryChannel !== 'email' && !subscribed) || (preferences?.deliveryChannel === 'email' && !capabilities.email)}
              onClick={async () => {
                if (!token) return;
                setPushBusy(true);
                try {
                  await saveQueue.current;
                  const result = await testNotification(token);
                  setSaveError(!result.sent || result.failed > 0);
                  setSaveMessage(result.sent ? (result.failed ? t('notifications.testPartial') : t('notifications.testSent')) : (result.failed ? t('notifications.testFailed') : t('notifications.noRecipient')));
                } catch { setSaveError(true); setSaveMessage(t('notifications.testFailed')); }
                finally { setPushBusy(false); }
              }}
              className="ml-3 mt-3 px-4 py-3 border rounded-card  disabled:opacity-50">
              {t('notifications.sendTest')}
            </button>
          </div>

          {/* Canal de réception : téléphone (push) ou email — routines et notifications créent les rappels */}
          {preferences && (
            <div className="bg-surface  rounded-card shadow-none p-6">
              <h2 className="text-xl font-bold mb-2 text-ink ">
                {t('notifications.deliveryChannel')}
              </h2>
              <p className="text-sm text-ink-2  mb-4">
                {t('notifications.deliveryDescription')}
              </p>
              <div className="flex flex-wrap gap-3">
                {(['push', 'email', 'both'] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    disabled={!capabilities || (channel !== 'email' && !capabilities.push) || (channel !== 'push' && !capabilities.email)}
                    onClick={() => {
                      setPreferences((p) => (p ? { ...p, deliveryChannel: channel } : p));
                      handleSavePreferencesBackend({ ...preferences, deliveryChannel: channel });
                    }}
                    className={`px-4 py-2 rounded-card border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      (preferences.deliveryChannel ?? 'push') === channel
                        ? 'border-accent bg-accent-soft  text-accent '
                        : 'border-line  text-ink  hover:bg-sunken '
                    }`}
                  >
                    {channel === 'push' && t('notifications.deliveryPush')}
                    {channel === 'email' && t('notifications.deliveryEmail')}
                    {channel === 'both' && t('notifications.deliveryBoth')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {preferences && <div className="bg-surface  rounded-card shadow-none p-6 space-y-4">
            <label className="block text-ink ">{t('notifications.timeZone')}
              <select value={preferences.timeZone} onChange={e => autoSavePreferences({ ...preferences, timeZone: e.target.value })} className="block mt-2 p-2 border rounded-card ">
                {[...new Set([preferences.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone, 'Europe/Brussels', 'Europe/Paris', 'Europe/London', 'America/Toronto', 'America/New_York', 'UTC'])].map(zone => <option key={zone} value={zone}>{zone}</option>)}
              </select>
            </label>
            <fieldset><legend className="text-ink ">{t('notifications.deliveryWindow')}</legend>
              <input aria-label={t('notifications.windowStart')} type="time" value={preferences.schedule.start} onChange={e => autoSavePreferences({ ...preferences, schedule: { ...preferences.schedule, start: e.target.value } })} className="mt-2 p-2 border rounded-card  " />
              <span className="mx-2 ">→</span>
              <input aria-label={t('notifications.windowEnd')} type="time" value={preferences.schedule.end} onChange={e => autoSavePreferences({ ...preferences, schedule: { ...preferences.schedule, end: e.target.value } })} className="p-2 border rounded-card  " />
            </fieldset>
            {(!capabilities?.push || !capabilities?.email) && <p className="text-sm text-ink ">{t('notifications.channelsUnavailable')}</p>}
          </div>}

          {/* Types de notifications : propositions + personnalisation */}
          {preferences && (
            <div className="bg-surface  rounded-card shadow-none p-6">
              <h2 className="text-xl font-bold mb-4 text-ink ">
                {t('notifications.types')}
              </h2>


              {/* Sujets suggérés */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-ink  mb-3">
                  {t('notifications.suggestedTypes')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_NOTIFICATION_TYPES.filter(
                    (suggested) => (preferences.types ?? {})[suggested] === undefined,
                  ).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => addType(label)}
                      className="px-3 py-1.5 text-sm rounded-card border border-accent text-accent  hover:bg-accent-soft  transition-colors"
                    >
                      + {label}
                    </button>
                  ))}
                  {SUGGESTED_NOTIFICATION_TYPES.every(
                    (s) => (preferences.types ?? {})[s] !== undefined,
                  ) && SUGGESTED_NOTIFICATION_TYPES.length > 0 && (
                    <span className="text-sm text-ink-2  self-center">
                      {t('notifications.allSuggestedAdded')}
                    </span>
                  )}
                </div>
              </div>

              {/* Ma personnalisation : sujets ajoutés, avec activation, horaire et modification */}
              <div>
                <h3 className="text-sm font-semibold text-ink  mb-3">
                  {t('notifications.myTypes')}
                </h3>
                <div className="space-y-4">
                  {Object.entries(preferences.types ?? {}).map(([type, enabled]) => {
                    const schedule: TypeSchedule =
                      (preferences.typeSchedules ?? {})[type] ?? DEFAULT_TYPE_SCHEDULE;
                    return (
                      <div
                        key={type}
                        className="p-4 border rounded-card border-line  bg-sunken/50  space-y-3"
                      >
                        {/* Ligne nom + actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          {editingType?.key === type ? (
                            <>
                              <input
                                type="text"
                                value={editingType.value}
                                onChange={(e) =>
                                  setEditingType((prev) => prev && { ...prev, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditType();
                                  if (e.key === 'Escape') setEditingType(null);
                                }}
                                className="flex-1 min-w-[120px] px-3 py-2 border rounded-card   text-ink"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={saveEditType}
                                className="shrink-0 px-3 py-1.5 text-sm bg-accent text-on-accent rounded-card hover:bg-accent"
                              >
                                {t('common.save')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingType(null)}
                                className="shrink-0 px-3 py-1.5 text-sm border rounded-card  "
                              >
                                {t('common.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 min-w-0 font-medium text-ink  truncate">
                                {type}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditType(type)}
                                className="shrink-0 p-1.5 rounded text-ink-2 hover:text-accent hover:bg-accent-soft "
                                title={t('notifications.renameType')}
                                aria-label={t('notifications.renameType')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled as boolean}
                                aria-label={enabled ? t('notifications.enabled') : t('notifications.disabled')}
                                onClick={() => updateType(type, !(enabled as boolean))}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-card border-2 text-sm font-medium transition-colors ${
                                  enabled
                                    ? 'bg-accent border-accent text-on-accent hover:bg-accent'
                                    : 'bg-transparent border-line  text-ink  hover:border-accent hover:text-accent '
                                }`}
                              >
                                {enabled ? t('notifications.enabled') : t('notifications.disabled')}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeType(type)}
                                className="shrink-0 p-1.5 rounded text-ink-2 hover:text-danger hover:bg-danger-soft "
                                title={t('notifications.removeType')}
                                aria-label={t('notifications.removeType')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {/* Heure et date pour ce type (masqué en mode édition du nom) */}
                        {editingType?.key !== type && (
                          <div className="flex flex-wrap items-center gap-4 pl-1 border-t border-line  pt-3">
                            <label className="flex items-center gap-2">
                              <span className="text-sm text-ink  whitespace-nowrap">
                                {t('notifications.time')}
                              </span>
                              <input
                                type="time"
                                value={schedule.time}
                                onChange={(e) => updateTypeSchedule(type, { time: e.target.value })}
                                className="px-2 py-1.5 border rounded-card   text-sm"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="text-sm text-ink  whitespace-nowrap">
                                {t('notifications.recurrence')}
                              </span>
                              <select
                                value={schedule.recurrence}
                                onChange={(e) => {
                                  const rec = e.target.value as RecurrenceKind;
                                  updateTypeSchedule(type, {
                                    recurrence: rec,
                                    date: rec === 'once' ? schedule.date ?? notificationCalendar(preferences.timeZone).date : undefined,
                                    weekDay: rec === 'weekly' ? (schedule.weekDay ?? notificationCalendar(preferences.timeZone).weekDay) : undefined,
                                    dayOfMonth: rec === 'monthly' ? (schedule.dayOfMonth ?? notificationCalendar(preferences.timeZone).dayOfMonth) : undefined,
                                    intervalHours: rec === 'hourly' ? (schedule.intervalHours ?? 2) : undefined,
                                  });
                                }}
                                className="px-2 py-1.5 border rounded-card   text-sm min-w-[160px]"
                              >
                                {RECURRENCE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {t(opt.labelKey)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {schedule.recurrence === 'once' && (
                              <label className="flex items-center gap-2">
                                <span className="text-sm text-ink  whitespace-nowrap">
                                  {t('notifications.date')}
                                </span>
                                <input
                                  type="date"
                                  value={schedule.date ?? notificationCalendar(preferences.timeZone).date}
                                  onChange={(e) => updateTypeSchedule(type, { date: e.target.value })}
                                  className="px-2 py-1.5 border rounded-card   text-sm"
                                />
                              </label>
                            )}
                            {schedule.recurrence === 'weekly' && (
                              <label className="flex items-center gap-2">
                                <span className="text-sm text-ink  whitespace-nowrap">
                                  {t('notifications.weekDay')}
                                </span>
                                <select
                                  value={schedule.weekDay ?? notificationCalendar(preferences.timeZone).weekDay}
                                  onChange={(e) => updateTypeSchedule(type, { weekDay: parseInt(e.target.value, 10) })}
                                  className="px-2 py-1.5 border rounded-card   text-sm min-w-[140px]"
                                >
                                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                                    <option key={d} value={d}>
                                      {t(`notifications.weekDay${d}`)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {schedule.recurrence === 'monthly' && (
                              <label className="flex items-center gap-2">
                                <span className="text-sm text-ink  whitespace-nowrap">
                                  {t('notifications.dayOfMonth')}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={schedule.dayOfMonth ?? notificationCalendar(preferences.timeZone).dayOfMonth}
                                  onChange={(e) =>
                                    updateTypeSchedule(type, {
                                      dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                    })
                                  }
                                  className="px-2 py-1.5 border rounded-card   text-sm w-16"
                                />
                              </label>
                            )}
                            {schedule.recurrence === 'hourly' && (
                              <label className="flex items-center gap-2">
                                <span className="text-sm text-ink  whitespace-nowrap">
                                  {t('notifications.intervalHours')}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={schedule.intervalHours ?? 2}
                                  onChange={(e) =>
                                    updateTypeSchedule(type, {
                                      intervalHours: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                    })
                                  }
                                  className="px-2 py-1.5 border rounded-card   text-sm w-16"
                                />
                                <span className="text-sm text-ink-2">{t('notifications.hours')}</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Ajouter un sujet personnalisé */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addType(newTypeLabel);
                    }}
                    placeholder={t('notifications.addCustomPlaceholder')}
                    className="flex-1 min-w-[180px] px-4 py-2 border rounded-card    text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => addType(newTypeLabel)}
                    disabled={!newTypeLabel.trim()}
                    className="px-4 py-2 bg-accent text-on-accent rounded-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('notifications.addCustom')}
                  </button>
                </div>
                {Object.keys(preferences.types ?? {}).length === 0 && (
                  <p className="mt-2 text-sm text-ink-2 ">
                    {t('notifications.myTypesHint')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Snooze */}
          {preferences && (
            <div className="bg-surface  rounded-card shadow-none p-6">
              <h2 className="text-xl font-bold mb-4 text-ink ">
                {t('notifications.snooze')}
              </h2>
              <input
                type="number"
                min="5"
                max="120"
                step="5"
                value={preferences.snooze ?? 15}
                onChange={(e) => {
                  const snooze = Math.min(120, Math.max(5, parseInt(e.target.value, 10) || 5));
                  autoSavePreferences({ ...preferences, snooze });
                }}
                className="w-full px-4 py-2 border rounded-card  "
              />
              <p className="mt-2 text-sm text-ink-2 ">
                Durée du report en minutes (5-120)
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !preferences}
              className="flex-1 bg-accent text-on-accent py-3 rounded-card font-semibold hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <Link
              href="/mes-animaux"
              className="flex-1 bg-sunken  text-ink  py-3 rounded-card font-semibold text-center hover:bg-sunken  transition-colors"
            >
              {t('common.cancel')}
            </Link>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
