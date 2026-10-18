'use client';
import { useState } from 'react';
import { Description } from '@radix-ui/react-dialog';
import Modal from '@/components/ui/Modal';
import { careAgenda } from '@/lib/agenda/client';
import {
  TYPE_LABELS,
  routineSchedule,
  zonedInput,
  zonedInstant,
  type Agenda,
  type Kind,
  type Source,
} from '@/lib/agenda/calendar';

type Props = {
  source?: Source;
  day: string;
  animalId: string;
  agenda: Agenda;
  token: string;
  onClose: () => void;
  onSaved: (day: string) => void;
};
export default function CareEditor({
  source,
  day,
  animalId: initialAnimal,
  agenda,
  token,
  onClose,
  onSaved,
}: Props) {
  const [kind, setKind] = useState<Kind>(source?.kind || 'routine');
  const schedule = source?.schedule || {};
  const initialDate =
    source?.kind === 'appointment'
      ? zonedInput(source.date!, agenda.timeZone)
      : source?.kind === 'medication'
        ? source.startDate!.slice(0, 10)
        : source?.kind === 'vaccination'
          ? source.nextDueDate!.slice(0, 10)
          : day;
  const [animalId, setAnimalId] = useState(
    source?.animalId || initialAnimal || agenda.animals[0]?.id || '',
  );
  const [title, setTitle] = useState(
    source?.kind === 'appointment' ? source.vetName || '' : source?.name || '',
  );
  const [type, setType] = useState(source?.type || 'nourrissage');
  const [frequency, setFrequency] = useState(
    typeof schedule.recurrence === 'string' ? schedule.recurrence : source?.frequency || 'once',
  );
  const [date, setDate] = useState(initialDate.slice(0, 10));
  const [time, setTime] = useState(
    source?.kind === 'appointment'
      ? initialDate.slice(11)
      : typeof schedule.time === 'string'
        ? schedule.time
        : typeof schedule.hour === 'number'
          ? `${String(schedule.hour).padStart(2, '0')}:00`
          : Array.isArray(schedule.hours) && typeof schedule.hours[0] === 'number'
            ? `${String(schedule.hours[0]).padStart(2, '0')}:00`
            : '08:00',
  );
  const [reason, setReason] = useState(source?.reason || ''),
    [location, setLocation] = useState(source?.location || '');
  const [end, setEnd] = useState(source?.endDate?.slice(0, 10) || '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [status, setStatus] = useState(source?.status || 'scheduled');
  const recurrenceOptions =
    source?.kind === 'medication'
      ? { daily: 'Chaque jour', weekly: 'Chaque semaine', every_x_hours: 'Intervalle prescrit' }
      : {
          once: 'Une seule fois',
          daily: 'Chaque jour',
          every_2_days: 'Tous les 2 jours',
          every_3_days: 'Tous les 3 jours',
          weekly: 'Chaque semaine',
          monthly: 'Chaque mois',
          hourly: 'Toutes les heures',
          custom: 'Horaires personnalisés existants',
        };
  const [interval, setInterval] = useState(Number(schedule.intervalHours) || 2);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let data: Record<string, unknown>;
      if (kind === 'routine') {
        if (!title.trim()) throw new Error('Donnez un nom au soin.');
        data = {
          name: title.trim(),
          type,
          frequency,
          schedule: routineSchedule(source, day, date, time, frequency, interval),
        };
      } else if (kind === 'appointment') {
        const input = `${date}T${time}`;
        data = {
          vetName: title.trim(),
          reason,
          location,
          status,
          ...(source ? {} : { reminderDays: [7, 1] }),
          date:
            source && input === zonedInput(source.date!, agenda.timeZone)
              ? source.date
              : zonedInstant(input, agenda.timeZone),
        };
        if (!source) delete data.status;
      } else if (kind === 'vaccination')
        data = { name: title.trim(), nextDueDate: `${date}T00:00:00.000Z` };
      else {
        if (end && end < date) throw new Error('La fin du traitement doit suivre son début.');
        data = {
          name: title.trim(),
          startDate: `${date}T00:00:00.000Z`,
          ...(end ? { endDate: `${end}T00:00:00.000Z` } : {}),
        };
      }
      await careAgenda.save(token, kind, animalId, source?.id, data);
      onSaved(source?.kind === 'medication' && date === initialDate.slice(0, 10) ? day : date);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={source ? 'Modifier le soin' : 'Ajouter un soin'}
      className="care-editor-modal"
    >
      <form onSubmit={save} className="care-form">
        <fieldset disabled={busy} className="care-form care-form-fields">
          <Description asChild>
            <p className="care-muted">
              Les horaires sont indiqués dans le fuseau {agenda.timeZone}.
            </p>
          </Description>
          {!source && (
            <label>
              Type de soin
              <select
                aria-label="Type de soin"
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
              >
                <option value="routine">Routine</option>
                {agenda.premium && <option value="appointment">Rendez-vous vétérinaire</option>}
              </select>
            </label>
          )}
          <label>
            Animal
            <select
              aria-label="Animal"
              required
              value={animalId}
              disabled={!!source || busy}
              onChange={(e) => setAnimalId(e.target.value)}
            >
              {agenda.animals.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {kind === 'appointment' ? 'Nom du vétérinaire' : 'Nom du soin'}
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {kind === 'routine' && (
            <>
              <label>
                Catégorie
                <select
                  aria-label="Catégorie"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Récurrence
                <select
                  aria-label="Récurrence"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {Object.entries(recurrenceOptions)
                    .filter(([value]) => value !== 'custom' || source?.frequency === 'custom')
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          <div className="care-form-row">
            <label>
              {kind === 'vaccination'
                ? 'Date du prochain rappel'
                : kind === 'medication'
                  ? 'Début du traitement'
                  : frequency === 'once' || kind === 'appointment'
                    ? 'Date'
                    : 'Jour de référence'}
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {(kind === 'routine' || kind === 'appointment') && (
              <label>
                Heure
                <input
                  type="time"
                  disabled={kind === 'routine' && frequency === 'custom'}
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
            )}
          </div>
          {kind === 'routine' && frequency === 'hourly' && (
            <label>
              Intervalle (heures)
              <input
                type="number"
                required
                min="1"
                max="24"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
              />
            </label>
          )}
          {kind === 'appointment' && (
            <>
              <label>
                Motif
                <input maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <label>
                Lieu
                <input
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
              {source && (
                <label>
                  Statut
                  <select
                    aria-label="Statut"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="scheduled">Prévu</option>
                    <option value="done">Effectué</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </label>
              )}
            </>
          )}
          {kind === 'medication' && (
            <>
              <label>
                Fin du traitement
                <input
                  type="date"
                  min={date}
                  required={!!source?.endDate}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
              <p className="care-callout">
                Posologie conservée : {source?.dose} {source?.unit}. Les changements concernent le
                traitement entier. Les prises restent aux horaires du système de rappels.
              </p>
            </>
          )}
          {kind === 'routine' && source && (
            <p className="care-callout">
              Cette modification s’applique à la routine entière, y compris ses prochaines
              occurrences. Elle ne déplace pas uniquement le soin sélectionné.
            </p>
          )}
          {kind === 'routine' && frequency === 'custom' && (
            <p className="care-callout">
              Les horaires personnalisés existants sont conservés. Leur édition détaillée reste
              disponible sur la fiche de l’animal.
            </p>
          )}
          {error && (
            <p role="alert" className="care-error">
              {error}
            </p>
          )}
          <div className="care-editor-actions">
            <button type="button" className="care-button" disabled={busy} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="care-button primary" disabled={busy || !animalId}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
