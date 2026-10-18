'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { careAgenda } from '@/lib/agenda/client';
import {
  dayKey,
  monthCells,
  shiftDay,
  shiftMonth,
  KIND_LABELS,
  TYPE_LABELS,
  type Agenda,
  type CareEvent,
  type Source,
} from '@/lib/agenda/calendar';
import CareEditor from './CareEditor';
import './agenda.css';
const labelDate = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-BE', { ...options, timeZone: 'UTC' }).format(
    new Date(day + 'T12:00:00Z'),
  );
export default function CareAgenda() {
  const { user, token, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="care-page">
        <p role="status">Chargement de votre agenda…</p>
      </div>
    );
  if (!user || !token)
    return (
      <div className="care-page">
        <section className="care-panel care-login">
          <CalendarDays size={32} />
          <h1>Votre agenda des soins</h1>
          <p>Connectez-vous pour retrouver le calendrier de vos animaux.</p>
          <Link href="/login" className="care-button primary">
            Se connecter
          </Link>
        </section>
      </div>
    );
  return <AgendaWorkspace key={user.id} token={token} />;
}
function AgendaWorkspace({ token }: { token: string }) {
  const initial = dayKey(new Date());
  const [selected, setSelected] = useState(initial),
    [month, setMonth] = useState(initial.slice(0, 7));
  const [view, setView] = useState<'month' | 'day'>('month');
  const [animal, setAnimal] = useState(''),
    [type, setType] = useState('all');
  const [data, setData] = useState<Agenda | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0),
    [editor, setEditor] = useState<{ source?: Source; day: string } | null>(null);
  const touched = useRef(false),
    initialized = useRef(false);
  const requestVersion = useRef(0),
    detail = useRef<HTMLElement>(null);
  const cells = useMemo(() => monthCells(month), [month]);
  useEffect(() => {
    const controller = new AbortController(),
      version = ++requestVersion.current;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        const result = await careAgenda.read(token, cells[0], cells[41], animal, controller.signal);
        if (active && version === requestVersion.current) {
          setData(result);
          if (!initialized.current) {
            initialized.current = true;
            if (!touched.current) {
              setSelected(result.today);
              setMonth(result.today.slice(0, 7));
            }
          }
        }
      } catch (failure) {
        if (active && !controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Agenda indisponible. Réessayez.');
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, cells, animal, refresh]);
  const events = (loading || error ? [] : data?.events || []).filter(
    (event) => type === 'all' || (type in KIND_LABELS ? event.kind === type : event.type === type),
  );
  const grouped = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const event of events) {
      const list = map.get(event.day) || [];
      list.push(event);
      map.set(event.day, list);
    }
    return map;
  }, [events]);
  const dayEvents = grouped.get(selected) || [];
  const animalName = (id: string) => data?.animals.find((a) => a.id === id)?.name || 'Animal';
  function choose(day: string, focus = false) {
    if (day < '1900-01-01' || day > '2100-12-31') return;
    touched.current = true;
    setSelected(day);
    setMonth(day.slice(0, 7));
    if (!focus && window.matchMedia('(max-width: 1100px)').matches)
      requestAnimationFrame(() =>
        detail.current?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        }),
      );
    if (focus) requestAnimationFrame(() => document.getElementById(`care-day-${day}`)?.focus());
  }
  function navigate(amount: number) {
    touched.current = true;
    const next = shiftMonth(month, amount);
    setMonth(next);
    setSelected(next + '-01');
  }
  function edit(event: CareEvent) {
    const source = data?.sources.find((s) => s.key === event.sourceKey);
    if (source) setEditor({ source, day: event.day });
  }
  const usable = !!data && !loading && !error;
  return (
    <div className="care-page" lang="fr">
      <div className="care-container">
        <header className="care-intro">
          <div>
            <span className="care-eyebrow">
              <CalendarDays size={15} aria-hidden="true" /> LE QUOTIDIEN DE VOS ANIMAUX
            </span>
            <h1>
              Agenda des soins<span>Chaque attention compte.</span>
            </h1>
            <p>
              Routines, traitements, vaccins et rendez-vous : une vue claire pour prendre soin
              d’eux, jour après jour.
            </p>
          </div>
          <button
            className="care-button primary"
            disabled={!usable || !data?.animals.length}
            onClick={() => setEditor({ day: selected })}
          >
            <Plus size={18} aria-hidden="true" /> Ajouter un soin
          </button>
        </header>
        <section className="care-panel care-filters" aria-label="Filtres de l’agenda">
          <span className="care-filter-title">
            <SlidersHorizontal size={17} aria-hidden="true" /> Votre calendrier
          </span>
          <label>
            Animal
            <select value={animal} onChange={(e) => setAnimal(e.target.value)}>
              <option value="">Tous les animaux</option>
              {data?.animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type de soin
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="medication">Traitements</option>
              <option value="vaccination">Vaccins</option>
              <option value="appointment">Vétérinaire</option>
            </select>
          </label>
          <div role="group" aria-label="Vue de l’agenda" className="care-view-switch">
            <button aria-pressed={view === 'month'} onClick={() => setView('month')}>
              Mois
            </button>
            <button aria-pressed={view === 'day'} onClick={() => setView('day')}>
              Jour
            </button>
          </div>
        </section>
        <div className="care-feedback" aria-live="polite">
          {loading ? (
            <span role="status">Mise à jour du calendrier…</span>
          ) : error ? (
            <span role="alert" className="care-error">
              {error}{' '}
              <button className="care-text-button" onClick={() => setRefresh((v) => v + 1)}>
                Réessayer
              </button>
            </span>
          ) : notice ? (
            <span>{notice}</span>
          ) : (
            <span>
              {events.length} soin{events.length !== 1 ? 's' : ''} sur la grille affichée ·{' '}
              {data?.timeZone}
            </span>
          )}
        </div>
        {data?.truncated && (
          <p role="status" className="care-callout">
            Plus de 5 000 soins sur cette période. Sélectionnez un animal pour afficher un
            calendrier complet.
          </p>
        )}
        <div className={`care-layout ${view === 'day' ? 'is-day' : ''}`}>
          <section
            className="care-panel care-calendar"
            aria-label="Calendrier des soins"
            aria-busy={loading}
          >
            <div className="care-calendar-toolbar">
              <div>
                <span className="care-eyebrow">VOTRE MOIS EN UN COUP D’ŒIL</span>
                <h2>{labelDate(month + '-01', { month: 'long', year: 'numeric' })}</h2>
              </div>
              <div className="care-navigation">
                <button
                  className="care-icon-button"
                  aria-label="Mois précédent"
                  disabled={month <= '1900-01'}
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  className="care-button"
                  onClick={() => choose(data?.today || dayKey(new Date()))}
                >
                  Aujourd’hui
                </button>
                <button
                  className="care-icon-button"
                  aria-label="Mois suivant"
                  disabled={month >= '2100-12'}
                  onClick={() => navigate(1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="care-date-controls">
              <label>
                Choisir le mois
                <input
                  type="month"
                  min="1900-01"
                  max="2100-12"
                  value={month}
                  onChange={(e) => {
                    if (/^\d{4}-\d{2}$/.test(e.target.value)) {
                      touched.current = true;
                      setMonth(e.target.value);
                      setSelected(e.target.value + '-01');
                    }
                  }}
                />
              </label>
              <label>
                Aller au jour
                <input
                  type="date"
                  value={selected}
                  onChange={(e) => {
                    if (e.target.value) choose(e.target.value);
                  }}
                />
              </label>
              <button
                className="care-icon-button"
                aria-label="Actualiser les soins"
                disabled={loading}
                onClick={() => setRefresh((v) => v + 1)}
              >
                <RefreshCw size={17} />
              </button>
            </div>
            {view === 'month' ? (
              <table className="care-month">
                <caption className="sr-only">
                  Calendrier de {labelDate(month + '-01', { month: 'long', year: 'numeric' })}.
                  Sélectionnez un jour pour voir et modifier ses soins.
                </caption>
                <thead>
                  <tr>
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                      <th scope="col" key={d}>
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, week) => (
                    <tr key={week}>
                      {cells.slice(week * 7, week * 7 + 7).map((day) => {
                        const entries = grouped.get(day) || [],
                          today = day === (data?.today || initial);
                        return (
                          <td key={day}>
                            <button
                              id={`care-day-${day}`}
                              tabIndex={day === selected ? 0 : -1}
                              className={`care-day ${day.slice(0, 7) !== month ? 'outside' : ''} ${day === selected ? 'selected' : ''} ${today ? 'today' : ''}`}
                              aria-label={`${labelDate(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${loading ? 'chargement des soins' : entries.length + ' soin' + (entries.length !== 1 ? 's' : '')}`}
                              aria-pressed={day === selected}
                              aria-current={today ? 'date' : undefined}
                              onClick={() => choose(day)}
                              onKeyDown={(e) => {
                                const shifts: Record<string, number> = {
                                  ArrowLeft: -1,
                                  ArrowRight: 1,
                                  ArrowUp: -7,
                                  ArrowDown: 7,
                                };
                                if (e.key in shifts) {
                                  e.preventDefault();
                                  choose(shiftDay(day, shifts[e.key]), true);
                                }
                              }}
                            >
                              <span className="care-day-number">{Number(day.slice(8))}</span>
                              {!loading && entries.length > 0 && (
                                <>
                                  <span className="care-day-count">
                                    {entries.length}
                                    <span className="sr-only"> soins</span>
                                  </span>
                                  <span className="care-day-preview" aria-hidden="true">
                                    {entries.slice(0, 2).map((entry) => (
                                      <span
                                        key={entry.id}
                                        className={`care-mini-event ${entry.kind}`}
                                      >
                                        <i />
                                        {entry.title}
                                      </span>
                                    ))}
                                    {entries.length > 2 && (
                                      <small>+ {entries.length - 2} autres</small>
                                    )}
                                  </span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="care-day-summary">
                <CalendarDays size={48} aria-hidden="true" />
                <h3>{labelDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                <p>
                  {dayEvents.length} soin{dayEvents.length !== 1 ? 's' : ''} dans votre journée.
                </p>
                <div className="care-navigation">
                  <button className="care-button" onClick={() => choose(shiftDay(selected, -1))}>
                    Jour précédent
                  </button>
                  <button className="care-button" onClick={() => choose(shiftDay(selected, 1))}>
                    Jour suivant
                  </button>
                </div>
              </div>
            )}
            <footer className="care-calendar-legend">
              {Object.entries(KIND_LABELS).map(([kind, label]) => (
                <span key={kind}>
                  <i className={kind} />
                  {label}
                </span>
              ))}
            </footer>
          </section>
          <section
            ref={detail}
            className="care-panel care-day-details"
            aria-labelledby="care-selected-title"
            aria-busy={loading}
          >
            <div className="care-day-heading">
              <span className="care-eyebrow">LE FIL DE LA JOURNÉE</span>
              <h2 id="care-selected-title">
                {labelDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <p>
                {loading
                  ? 'Chargement…'
                  : `${dayEvents.length} soin${dayEvents.length !== 1 ? 's' : ''} · ${animal ? animalName(animal) : 'Tous vos animaux'}`}
              </p>
            </div>
            {usable ? (
              dayEvents.length ? (
                <ol className="care-timeline">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        className={`care-event ${event.kind}`}
                        onClick={() => edit(event)}
                        aria-label={`Modifier ${event.title}, ${animalName(event.animalId)}, ${event.allDay ? 'dans la journée' : event.time}`}
                      >
                        <span className="care-event-time">
                          <Clock3 size={13} aria-hidden="true" />
                          {event.allDay ? 'Journée' : event.time}
                        </span>
                        <strong>{event.title}</strong>
                        <span className="care-event-meta">
                          {animalName(event.animalId)}{' '}
                          <span>
                            ·{' '}
                            {event.kind === 'routine'
                              ? TYPE_LABELS[event.type] || 'Routine'
                              : KIND_LABELS[event.kind]}
                          </span>
                        </span>
                        <span className="care-event-edit">
                          Modifier <ChevronRight size={14} aria-hidden="true" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="care-empty">
                  <CalendarDays size={32} aria-hidden="true" />
                  <h3>Une journée au calme</h3>
                  <p>Aucun soin ne correspond à vos filtres ce jour-là.</p>
                </div>
              )
            ) : (
              <p className="care-muted">
                {error ? 'Les soins n’ont pas pu être chargés.' : 'Préparation de votre journée…'}
              </p>
            )}
            <button
              className="care-button care-day-add"
              disabled={!usable || !data?.animals.length}
              onClick={() => setEditor({ day: selected })}
            >
              <Plus size={17} aria-hidden="true" /> Ajouter à cette journée
            </button>
            <Link
              className="care-animal-link"
              href={animal ? `/mes-animaux/${animal}` : '/mes-animaux'}
            >
              Ouvrir les fiches de mes animaux →
            </Link>
          </section>
        </div>
        {data && !data.premium && (
          <p className="care-muted care-premium-note">
            Vos routines restent accessibles ici. Les traitements, vaccins et rendez-vous du carnet
            de santé sont inclus avec <Link href="/parametres/abonnement">Premium</Link>.
          </p>
        )}
        {!loading && !error && data?.animals.length === 0 && (
          <p className="care-callout">
            Votre calendrier est prêt. <Link href="/mes-animaux">Ajoutez votre premier animal</Link>{' '}
            pour organiser ses soins.
          </p>
        )}
        {editor && data && (
          <CareEditor
            key={editor.source?.key || 'new'}
            source={editor.source}
            day={editor.day}
            animalId={animal}
            agenda={data}
            token={token}
            onClose={() => setEditor(null)}
            onSaved={(day) => {
              setEditor(null);
              choose(day);
              setRefresh((v) => v + 1);
              setNotice('Soin enregistré. Le calendrier et la fiche de votre animal sont à jour.');
            }}
          />
        )}
      </div>
    </div>
  );
}
