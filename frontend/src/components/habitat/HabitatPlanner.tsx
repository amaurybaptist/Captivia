'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Box,
  ChevronRight,
  Download,
  Leaf,
  Plus,
  Printer,
  Redo2,
  Ruler,
  Shuffle,
  Sparkles,
  Undo2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Animal } from '@/lib/api';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import {
  PROFILES,
  dimensionError,
  generateLayout,
  getProfile,
  isAquatic,
  matchProfile,
  type Dimensions,
  type HabitatItem,
  type ProfileId,
} from '@/lib/habitat/planner';
import {
  CATALOG,
  habitatSignature as signature,
  catalogItem,
  clampItem,
  downloadFile,
  inspectLayout,
  isRequired,
  newSnapshot,
  parseSnapshot,
  type HabitatProject,
  type HabitatSnapshot,
} from '@/lib/habitat/workspace';
import { ProjectRequestError } from '@/lib/habitat/projects';
import { HabitatPlan } from './HabitatPlan';
import { HabitatEditor } from './HabitatEditor';
import { HabitatEquipment } from './HabitatEquipment';
import { HabitatLibrary, type ProjectStorage } from './HabitatLibrary';
import { HabitatPrint } from './HabitatPrint';
import { useHabitatHistory } from './useHabitatHistory';
import { useHabitatProjects } from './useHabitatProjects';
import './habitat.css';

const Scene = dynamic(() => import('./HabitatScene'), {
  ssr: false,
  loading: () => (
    <div className="habitat-scene-loading" role="status">
      Préparation de votre habitat 3D…
    </div>
  ),
});
const INITIAL = newSnapshot('leopard', PROFILES[0].defaults);
const INITIAL_NAME = 'Mon habitat';
type CurrentProject = { project: HabitatProject; storage: ProjectStorage };
type SpeciesInfo = {
  animalId: string;
  speciesId: number;
  habitat?: {
    tempMin?: number;
    tempMax?: number;
    humidityMin?: number;
    humidityMax?: number;
    minSpaceSize?: string;
  } | null;
};

export default function HabitatPlanner({
  locale,
  initialAnimalId = '',
}: {
  locale: string;
  initialAnimalId?: string;
}) {
  const { user, token } = useAuth(),
    owner = user?.id || 'guest';
  const { snapshot, commit, reset, undo, redo, canUndo, canRedo, undoTarget, redoTarget } =
    useHabitatHistory(INITIAL);
  const library = useHabitatProjects(user?.id, token);
  const [profileId, setProfileId] = useState<ProfileId>('leopard'),
    [dimensions, setDimensions] = useState<Dimensions>({ ...INITIAL.dimensions });
  const [animals, setAnimals] = useState<Animal[]>([]),
    [animalId, setAnimalId] = useState(''),
    [animalBusy, setAnimalBusy] = useState(false);
  const [animalMessage, setAnimalMessage] = useState(''),
    [speciesInfo, setSpeciesInfo] = useState<SpeciesInfo | null>(null);
  const [draftTouched, setDraftTouched] = useState(false),
    [draftFailed, setDraftFailed] = useState(false);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [selected, setSelected] = useState('');
  const [view, setView] = useState<'3d' | '2d'>('3d'),
    [name, setName] = useState(INITIAL_NAME);
  const [current, setCurrent] = useState<CurrentProject | undefined>(),
    [savedSignature, setSavedSignature] = useState(signature(INITIAL_NAME, INITIAL));
  const [snapshotOwner, setSnapshotOwner] = useState(owner),
    [operationBusy, setOperationBusy] = useState(false);
  const lookupVersion = useRef(0),
    activeOwner = useRef(owner),
    importInput = useRef<HTMLInputElement>(null);
  const profile = getProfile(profileId)!,
    shownProfile = getProfile(snapshot.profileId)!;
  const items = snapshot.items,
    activeItem = items.find((item) => item.id === selected);
  const dirty =
    profileId !== snapshot.profileId ||
    animalId !== snapshot.animalId ||
    (['width', 'depth', 'height'] as const).some(
      (key) => dimensions[key] !== snapshot.dimensions[key],
    );
  const unsaved = signature(name, snapshot) !== savedSignature;
  const issues = inspectLayout(snapshot),
    invalidLayout = issues.some((issue) => issue.severity === 'error');
  const busy = library.busy || operationBusy || animalBusy;
  const speciesId = animals.find((animal) => animal.id === snapshot.animalId)?.speciesId;

  useEffect(() => {
    let active = true;
    const generation = ++lookupVersion.current;
    activeOwner.current = owner;
    void Promise.resolve().then(async () => {
      if (!active) return;
      reset(INITIAL);
      setProfileId('leopard');
      setDimensions({ ...INITIAL.dimensions });
      setName(INITIAL_NAME);
      setSavedSignature(signature(INITIAL_NAME, INITIAL));
      setCurrent(undefined);
      setSnapshotOwner(owner);
      setAnimals([]);
      setAnimalId('');
      setAnimalMessage('');
      setAnimalBusy(false);
      setSpeciesInfo(null);
      setNotice('');
      setError('');
      setSelected('');
      setOperationBusy(false);
      setDraftTouched(false);
      setDraftFailed(false);
      if (!token) return;
      try {
        const data = await api.getMyAnimals(token);
        if (!active || generation !== lookupVersion.current) return;
        if (!Array.isArray(data)) throw new Error('Invalid response');
        setAnimals(data);
        const animal = data.find((entry: Animal) => entry.id === initialAnimalId) as
          | Animal
          | undefined;
        if (!animal) return;
        setAnimalBusy(true);
        const result = await resolveAnimal(animal);
        if (!active || generation !== lookupVersion.current) return;
        if (!result) {
          setAnimalMessage(
            'Cette espèce n’a pas encore de modèle dédié. Choisissez un modèle sans attribuer cet animal.',
          );
          return;
        }
        setProfileId(result.profile.id);
        setDimensions({ ...result.profile.defaults });
        setAnimalId(animal.id);
        setSpeciesInfo(result.info);
        const next = newSnapshot(result.profile.id, result.profile.defaults, 0, animal.id);
        reset(next);
        setName(`Habitat de ${animal.name}`.slice(0, 80));
      } catch {
        if (active && generation === lookupVersion.current)
          setAnimalMessage(
            'Vos animaux ou leurs fiches sont indisponibles pour le moment. Les modèles restent accessibles.',
          );
      } finally {
        if (active && generation === lookupVersion.current) setAnimalBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [owner, token, initialAnimalId, reset]);

  useEffect(() => {
    if (snapshotOwner !== owner || (!canUndo && !draftTouched)) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          `captivia:habitat-draft:v2:${owner}`,
          JSON.stringify({ name, snapshot }),
        );
        setDraftFailed(false);
      } catch {
        setDraftFailed(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [snapshot, name, owner, snapshotOwner, canUndo, draftTouched]);
  useEffect(() => {
    if (!unsaved && !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved, dirty]);

  async function resolveAnimal(animal: Animal) {
    const species = (await api.getSpecies(String(animal.speciesId))) as {
      canonicalName?: string;
      scientificName?: string;
      profile?: { scientificName?: string };
      habitat?: SpeciesInfo['habitat'];
    };
    const match = matchProfile(
      species.profile?.scientificName || species.canonicalName || species.scientificName || '',
    );
    return match
      ? {
          profile: match,
          info: { animalId: animal.id, speciesId: animal.speciesId, habitat: species.habitat },
        }
      : null;
  }
  async function chooseAnimal(id: string) {
    const version = ++lookupVersion.current;
    setAnimalId('');
    setAnimalMessage('');
    setSpeciesInfo(null);
    setNotice('');
    const animal = animals.find((a) => a.id === id);
    if (!animal) {
      setAnimalBusy(false);
      return;
    }
    setAnimalBusy(true);
    try {
      const result = await resolveAnimal(animal);
      if (version !== lookupVersion.current) return;
      if (!result) {
        setAnimalMessage(
          'Espèce non prise en charge : aucun modèle approximatif ne lui sera attribué.',
        );
        return;
      }
      setAnimalId(id);
      setProfileId(result.profile.id);
      setDimensions({ ...result.profile.defaults });
      setSpeciesInfo(result.info);
      setError('');
    } catch {
      if (version === lookupVersion.current)
        setAnimalMessage('Impossible de vérifier l’espèce. Réessayez dans un instant.');
    } finally {
      if (version === lookupVersion.current) setAnimalBusy(false);
    }
  }
  function generate(variant = 0) {
    const invalid = dimensionError(dimensions, profile);
    setError(invalid || '');
    if (invalid || animalBusy) return;
    if (
      canUndo &&
      !window.confirm(
        'Générer un nouvel agencement remplacera les modifications du décor. Vous pourrez annuler cette action. Continuer ?',
      )
    )
      return;
    commit({ ...newSnapshot(profileId, dimensions, variant, animalId), notes: snapshot.notes });
    setSelected('');
    setNotice('Agencement généré. Vous pouvez maintenant le personnaliser.');
  }
  function editItem(item: HabitatItem) {
    const changed = clampItem(item, snapshot.dimensions, shownProfile);
    commit((previous) => ({
      ...previous,
      items: previous.items.map((entry) => (entry.id === changed.id ? changed : entry)),
    }));
  }
  function add(key: string) {
    const entry = CATALOG.find((candidate) => candidate.key === key);
    if (!entry) return;
    const item = catalogItem(entry, snapshot);
    if (!item) {
      setNotice(
        'Pas d’emplacement libre proposé. Réorganisez le décor avant d’ajouter cet élément (80 éléments maximum).',
      );
      return;
    }
    commit({ ...snapshot, items: [...items, item] });
    setSelected(item.id);
    setNotice('Élément ajouté. Ajustez sa position et vérifiez sa compatibilité réelle.');
  }
  function apply(next: HabitatSnapshot, title: string, project?: CurrentProject) {
    ++lookupVersion.current;
    setAnimalBusy(false);
    const safe = {
      ...next,
      animalId: animals.some((animal) => animal.id === next.animalId) ? next.animalId : '',
    };
    reset(safe);
    setProfileId(safe.profileId);
    setDimensions({ ...safe.dimensions });
    setAnimalId(safe.animalId);
    setName(title);
    setCurrent(project);
    setSelected('');
    setError('');
    setAnimalMessage('');
    setSpeciesInfo(null);
    setSavedSignature(project ? signature(title, safe) : '');
    setDraftTouched(false);
  }
  const canReplace = () =>
    !(unsaved || dirty) ||
    window.confirm('Des modifications ne sont pas enregistrées. Les remplacer par ce projet ?');
  async function save(storage: ProjectStorage, copy: boolean) {
    if (dirty || invalidLayout) {
      setNotice('Appliquez les dimensions et corrigez les erreurs du plan avant d’enregistrer.');
      return;
    }
    const title = name.trim();
    if (!title) {
      setNotice('Donnez un nom au projet.');
      return;
    }
    const scope = activeOwner.current;
    setOperationBusy(true);
    try {
      const existing = !copy && current?.storage === storage ? current.project : undefined;
      const project =
        storage === 'cloud'
          ? await library.saveCloud(title, snapshot, existing)
          : library.saveLocal(title, snapshot, existing?.id);
      if (activeOwner.current !== scope) return;
      setName((previous) => (previous.trim() === title ? project.name : previous));
      setCurrent({ project, storage });
      setSavedSignature(signature(project.name, project.snapshot));
      setNotice(
        storage === 'cloud'
          ? 'Projet enregistré dans votre compte. Il est disponible sur vos autres appareils.'
          : 'Projet enregistré sur cet appareil.',
      );
    } catch (failure) {
      if (activeOwner.current === scope)
        setNotice(
          failure instanceof ProjectRequestError && failure.status === 409
            ? 'Ce projet a changé sur un autre appareil. Actualisez la bibliothèque et ouvrez la nouvelle version, ou enregistrez une copie pour garder vos modifications.'
            : failure instanceof Error
              ? failure.message
              : 'Enregistrement impossible. Exportez le projet ou gardez une copie locale.',
        );
    } finally {
      if (activeOwner.current === scope) setOperationBusy(false);
    }
  }
  async function remove(project: HabitatProject, storage: ProjectStorage) {
    const scope = activeOwner.current;
    try {
      await library.remove(project, storage);
      if (activeOwner.current !== scope) return;
      if (current?.project.id === project.id) {
        setCurrent(undefined);
        setSavedSignature('');
      }
      setNotice('Projet supprimé de la bibliothèque. L’aperçu actuel reste disponible.');
    } catch (failure) {
      if (activeOwner.current !== scope) return;
      setNotice(failure instanceof Error ? failure.message : 'Suppression impossible.');
    }
  }
  async function importProject(file?: File) {
    if (!file) return;
    if (file.size > 100000) {
      setNotice('Choisissez un fichier de projet de moins de 100 Ko.');
      return;
    }
    const scope = activeOwner.current;
    try {
      const data = JSON.parse(await file.text()) as {
        format?: string;
        name?: unknown;
        snapshot?: unknown;
      };
      if (scope !== activeOwner.current) return;
      const imported = parseSnapshot(data.snapshot);
      if (
        data.format !== 'captivia-habitat' ||
        !imported ||
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.length > 80
      )
        throw new Error('Format invalide');
      if (!canReplace()) return;
      apply({ ...imported, animalId: '' }, data.name);
      setNotice(
        'Projet importé. Choisissez votre animal si nécessaire, puis enregistrez-le dans votre bibliothèque.',
      );
    } catch {
      setNotice('Fichier invalide ou incompatible. Aucune modification appliquée.');
    }
  }
  function exportProject() {
    downloadFile(
      new Blob(
        [
          JSON.stringify({
            format: 'captivia-habitat',
            version: 2,
            name: name.trim() || INITIAL_NAME,
            snapshot,
          }),
        ],
        { type: 'application/json' },
      ),
      `captivia-${snapshot.profileId}.captivia.json`,
    );
  }
  function restoreDraft() {
    try {
      const raw = JSON.parse(localStorage.getItem(`captivia:habitat-draft:v2:${owner}`) || 'null');
      const draft = parseSnapshot(raw?.snapshot);
      if (!draft || typeof raw?.name !== 'string' || raw.name.length > 80) {
        setNotice('Aucun brouillon valide trouvé.');
        return;
      }
      if (canReplace()) {
        apply(draft, raw.name);
        setNotice('Brouillon repris. Enregistrez-le pour le conserver dans la bibliothèque.');
      }
    } catch {
      setNotice('Impossible de reprendre le brouillon.');
    }
  }
  function exportPlan() {
    const element = document.getElementById('habitat-export-plan');
    if (!element) return;
    const svg = element.cloneNode(true) as SVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('color', '#14252b');
    const top = Number(svg.getAttribute('viewBox')!.split(' ')[3]);
    svg.setAttribute('viewBox', `0 0 520 ${top + items.length * 22 + 100}`);
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', '#ffffff');
    svg.prepend(background);
    [
      ...items.map((item, index) => `${index + 1}. ${item.label}`),
      'Plan indicatif : mesures et notices réelles à vérifier.',
      'Décors : Poly Haven, ambientCG, Kenney — CC0.',
    ].forEach((line, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '20');
      text.setAttribute('y', String(top + 12 + index * 22));
      text.setAttribute('font-size', '11');
      text.setAttribute('fill', '#14252b');
      text.textContent = line;
      svg.append(text);
    });
    downloadFile(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: 'image/svg+xml;charset=utf-8',
      }),
      `captivia-plan-${snapshot.profileId}.svg`,
    );
  }

  if (snapshotOwner !== owner)
    return (
      <div className="habitat-scene-loading" role="status">
        Ouverture de votre espace de projets…
      </div>
    );
  return (
    <div className="habitat-page" lang="fr">
      <div className="habitat-container">
        <header className="habitat-intro">
          <div>
            <span className="habitat-eyebrow">
              <Leaf size={14} aria-hidden="true" />
              L’ATELIER CAPTIVIA
            </span>
            <h1>
              Un habitat pensé
              <br />
              pour <em>son bien-être.</em>
            </h1>
            <p>
              Les dimensions de votre cuve, un aménagement proposé pour son espèce, et la liberté de
              l’adapter.
            </p>
          </div>
          <div className="habitat-intro-tag">
            <Box size={22} aria-hidden="true" />
            <span>
              Concepteur 3D<small>{PROFILES.length} modèles · vos projets sauvegardés</small>
            </span>
          </div>
        </header>
        <div className="habitat-workspace">
          <aside className="habitat-panel habitat-settings">
            <div className="habitat-step">
              <span>01</span>
              <h2>Votre projet</h2>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                generate();
              }}
            >
              {token ? (
                <div className="habitat-field">
                  <label htmlFor="habitat-animal">Depuis mes animaux</label>
                  <select
                    id="habitat-animal"
                    value={animalId}
                    disabled={animalBusy}
                    onChange={(event) => void chooseAnimal(event.target.value)}
                  >
                    <option value="">Choisir un modèle sans animal</option>
                    {animals.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="habitat-small">
                  <Link href={`/${locale}/login`}>Connectez-vous</Link> pour retrouver vos animaux
                  et sauvegarder vos projets dans votre compte.
                </p>
              )}
              {animalBusy && (
                <p className="habitat-small" role="status">
                  Vérification de l’espèce…
                </p>
              )}
              {animalMessage && (
                <p className="habitat-callout" role="status">
                  {animalMessage}
                </p>
              )}
              <div className="habitat-field">
                <label htmlFor="habitat-species">Espèce ou type d’installation</label>
                <select
                  id="habitat-species"
                  value={profileId}
                  onChange={(event) => {
                    const next = getProfile(event.target.value)!;
                    ++lookupVersion.current;
                    setAnimalBusy(false);
                    setAnimalId('');
                    setProfileId(next.id);
                    setDimensions({ ...next.defaults });
                    setError('');
                    setNotice('');
                    setAnimalMessage('');
                    setSpeciesInfo(null);
                  }}
                >
                  {PROFILES.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="habitat-field-note">
                  {profile.habitat} · {profile.occupancy}
                </span>
              </div>
              <fieldset className="habitat-dimensions">
                <legend>
                  <Ruler size={16} aria-hidden="true" />
                  Dimensions intérieures, en cm
                </legend>
                <div>
                  {(
                    [
                      ['width', 'Longueur'],
                      ['depth', 'Profondeur'],
                      ['height', 'Hauteur'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} htmlFor={`habitat-${key}`}>
                      {label}
                      <input
                        id={`habitat-${key}`}
                        type="number"
                        inputMode="decimal"
                        min="10"
                        max="300"
                        step=".1"
                        required
                        value={Number.isNaN(dimensions[key]) ? '' : dimensions[key]}
                        onChange={(event) =>
                          setDimensions({
                            ...dimensions,
                            [key]: event.target.value === '' ? NaN : Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="habitat-small">
                Référence de ce modèle : {profile.reference.width} × {profile.reference.depth} ×{' '}
                {profile.reference.height} cm. Adapter au gabarit réel de l’animal, sans assimiler
                cette référence à un minimum légal universel.
              </p>
              {error && (
                <p className="habitat-callout warning" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="habitat-button primary full" disabled={animalBusy}>
                <Sparkles size={17} aria-hidden="true" />
                Générer mon aménagement
              </button>
            </form>
            <div className="habitat-sidebar-note">
              <p>
                Les conditions de vie priment sur l’apparence. Aucun choix de population marine ni
                cohabitation n’est décidé automatiquement.
              </p>
            </div>
          </aside>
          <section className="habitat-panel habitat-preview" aria-label="Proposition d’aménagement">
            <div className="habitat-preview-heading">
              <div>
                <span className="habitat-eyebrow">{shownProfile.habitat}</span>
                <h2>{shownProfile.name}</h2>
                <p>
                  {snapshot.dimensions.width} × {snapshot.dimensions.depth} ×{' '}
                  {snapshot.dimensions.height} cm
                  {isAquatic(shownProfile)
                    ? ` · ${Math.round((snapshot.dimensions.width * snapshot.dimensions.depth * snapshot.dimensions.height) / 1000)} L bruts`
                    : ''}
                </p>
              </div>
              <div className="habitat-view-tabs" role="group" aria-label="Mode d’affichage">
                <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>
                  3D
                </button>
                <button type="button" aria-pressed={view === '2d'} onClick={() => setView('2d')}>
                  Plan 2D
                </button>
              </div>
            </div>
            {dirty && (
              <p className="habitat-dirty" role="status">
                Paramètres modifiés : générez pour les appliquer à l’aperçu.
              </p>
            )}
            {view === '3d' ? (
              <ErrorBoundary
                key={`${snapshot.profileId}-${snapshot.variant}`}
                fallback={
                  <div className="habitat-fallback">
                    <p>La 3D est indisponible. Votre plan reste accessible.</p>
                    <button type="button" className="habitat-button" onClick={() => setView('2d')}>
                      Afficher le plan 2D
                    </button>
                  </div>
                }
              >
                <Scene
                  dimensions={snapshot.dimensions}
                  profile={shownProfile}
                  items={items}
                  selected={selected}
                  onSelect={setSelected}
                  onTransform={(id, position, rotation) => {
                    const item = items.find((entry) => entry.id === id);
                    if (item && !item.locked && !dirty)
                      editItem({
                        ...item,
                        position,
                        rotation: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, rotation)),
                      });
                  }}
                  onFailure={() => setView('2d')}
                  editingDisabled={dirty}
                />
              </ErrorBoundary>
            ) : (
              <div className="habitat-plan-container">
                <HabitatPlan
                  dimensions={snapshot.dimensions}
                  items={items}
                  profile={shownProfile}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
            )}
            <div className="habitat-preview-footer">
              <span>
                <span className="habitat-status-dot" />
                {items.length} éléments · placement indicatif
              </span>
              <div className="habitat-editor-actions">
                <button
                  type="button"
                  className="habitat-button"
                  disabled={!canUndo || dirty}
                  onClick={() => {
                    if (undoTarget) {
                      undo();
                      setDraftTouched(true);
                      setProfileId(undoTarget.profileId);
                      setDimensions({ ...undoTarget.dimensions });
                      setAnimalId(undoTarget.animalId);
                      setSelected('');
                    }
                  }}
                  aria-label="Annuler la dernière modification"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  className="habitat-button"
                  disabled={!canRedo || dirty}
                  onClick={() => {
                    if (redoTarget) {
                      redo();
                      setDraftTouched(true);
                      setProfileId(redoTarget.profileId);
                      setDimensions({ ...redoTarget.dimensions });
                      setAnimalId(redoTarget.animalId);
                      setSelected('');
                    }
                  }}
                  aria-label="Rétablir la modification"
                >
                  <Redo2 size={15} />
                </button>
                <button
                  type="button"
                  className="habitat-button"
                  disabled={dirty || animalBusy}
                  onClick={() => generate((snapshot.variant + 1) % 6)}
                >
                  <Shuffle size={15} />
                  Autre disposition
                </button>
              </div>
            </div>
          </section>
        </div>
        <p className="habitat-notice" role="status" aria-live="polite">
          {notice ||
            (draftFailed
              ? 'Le brouillon automatique est indisponible. Exportez le projet pour conserver vos modifications.'
              : 'Le brouillon de l’agencement est conservé après modification sur cet appareil. Enregistrez un projet pour le retrouver dans votre bibliothèque.')}
        </p>
        <div className="habitat-project-actions">
          <div>
            <button
              type="button"
              className="habitat-button"
              disabled={dirty || invalidLayout}
              onClick={exportPlan}
            >
              <Download size={15} />
              Plan coté SVG
            </button>
            <button
              type="button"
              className="habitat-button"
              disabled={dirty || invalidLayout}
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Imprimer / PDF
            </button>
            <button
              type="button"
              className="habitat-button"
              disabled={dirty || invalidLayout}
              onClick={exportProject}
            >
              <Download size={15} />
              Exporter le projet
            </button>
            <button
              type="button"
              className="habitat-button"
              onClick={() => importInput.current?.click()}
            >
              <Upload size={15} />
              Importer un projet
            </button>
            <button type="button" className="habitat-button" onClick={restoreDraft}>
              Reprendre le brouillon
            </button>
            <button
              type="button"
              className="habitat-button"
              onClick={() => {
                if (canReplace()) {
                  apply(newSnapshot(profile.id, profile.defaults), 'Nouveau projet');
                  setNotice('Nouveau projet créé.');
                }
              }}
            >
              <Plus size={15} />
              Nouveau projet
            </button>
            <input
              hidden
              type="file"
              ref={importInput}
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void importProject(file);
              }}
            />
          </div>
        </div>
        <section className="habitat-details-grid">
          <div className="habitat-panel habitat-equipment">
            <div className="habitat-step">
              <span>02</span>
              <h2>Comprendre son habitat</h2>
            </div>
            <div className="habitat-item-grid">
              {items.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`habitat-item ${selected === item.id ? 'is-selected' : ''}`}
                  aria-pressed={selected === item.id}
                  onClick={() => setSelected(selected === item.id ? '' : item.id)}
                >
                  <span className="habitat-item-number">{index + 1}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>
                      {item.locked ? 'Verrouillé · ' : ''}
                      {item.placement}
                    </small>
                  </span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
            {activeItem && (
              <div className="habitat-item-description" role="status">
                <strong>{activeItem.label}</strong>
                <p>{activeItem.reason}</p>
              </div>
            )}
            <h3 className="habitat-subheading">Contrôles de l’agencement</h3>
            {issues.length ? (
              <ul className="habitat-issues">
                {issues.map((issue, index) => (
                  <li key={index} className={issue.severity === 'error' ? 'is-error' : ''}>
                    {issue.itemId ? (
                      <button type="button" onClick={() => setSelected(issue.itemId!)}>
                        {issue.message}
                      </button>
                    ) : (
                      issue.message
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="habitat-callout">
                Aucun dépassement ou chevauchement solide détecté. Ce contrôle géométrique ne valide
                pas les conditions de vie réelles.
              </p>
            )}
          </div>
          <HabitatEditor
            item={activeItem}
            profile={shownProfile}
            disabled={dirty}
            onChange={editItem}
            onAdd={add}
            onRemove={() => {
              if (activeItem && !isRequired(activeItem, shownProfile)) {
                commit({
                  ...snapshot,
                  items: items.filter((item) => item.id !== activeItem.id),
                  checked: snapshot.checked.filter((id) => id !== activeItem.id),
                });
                setSelected('');
              }
            }}
            onReset={() => {
              const base = generateLayout(shownProfile, snapshot.dimensions, snapshot.variant).find(
                (item) => item.id === selected,
              );
              if (base) editItem(base);
            }}
          />
        </section>
        <section className="habitat-details-grid habitat-secondary-grid">
          <HabitatEquipment
            snapshot={snapshot}
            speciesId={speciesId}
            onCheck={(id) =>
              commit({
                ...snapshot,
                checked: snapshot.checked.includes(id)
                  ? snapshot.checked.filter((key) => key !== id)
                  : [...snapshot.checked, id],
              })
            }
          />
          <div className="habitat-panel habitat-care">
            <span className="habitat-eyebrow">LE VIVANT D’ABORD</span>
            <h2>Des repères, puis des mesures réelles.</h2>
            <div className="habitat-parameters">
              {shownProfile.parameters.map((parameter) => (
                <article key={parameter.label}>
                  <span>{parameter.label}</span>
                  <strong>{parameter.value}</strong>
                  <p>{parameter.context}</p>
                </article>
              ))}
            </div>
            <p>{shownProfile.climate}</p>
            <p>{shownProfile.care}</p>
            <p>{shownProfile.substrate}</p>
            {speciesInfo?.animalId === snapshot.animalId && speciesInfo.habitat && (
              <div className="habitat-callout">
                <strong>Fiche de votre animal</strong>
                {typeof speciesInfo.habitat.minSpaceSize === 'string' && (
                  <p>Espace indiqué : {speciesInfo.habitat.minSpaceSize}</p>
                )}
                {typeof speciesInfo.habitat.tempMin === 'number' &&
                  typeof speciesInfo.habitat.tempMax === 'number' && (
                    <p>
                      Plage générale indiquée : {speciesInfo.habitat.tempMin}–
                      {speciesInfo.habitat.tempMax} °C (à distinguer du point de chauffe).
                    </p>
                  )}
              </div>
            )}
            {speciesId && (
              <Link href={`/${locale}/species/${speciesId}`} className="habitat-source">
                Consulter la fiche complète de l’espèce ↗
              </Link>
            )}
            <div className="habitat-callout">
              Les couleurs et ombres ne simulent ni chaleur, UVB ni circulation d’eau. Vérifiez
              distances de sécurité, stabilité et notices du matériel réel.
            </div>
            <a
              href={shownProfile.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="habitat-source"
            >
              {shownProfile.source.title} ↗
            </a>
            <p className="habitat-small">
              Décors{' '}
              <a
                href="https://kenney.nl/assets/nature-kit"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kenney Nature Kit
              </a>{' '}
              · CC0. Roches, branches et fougères texturées : Poly Haven (CC0). Sols : ambientCG
              (CC0). Les décors ne constituent ni une identification botanique ni une référence
              commerciale.
            </p>
            <div className="habitat-notes-label">
              <label htmlFor="habitat-notes">Notes du projet</label>
              <textarea
                id="habitat-notes"
                rows={5}
                maxLength={3000}
                value={snapshot.notes}
                onChange={(event) => commit({ ...snapshot, notes: event.target.value })}
                placeholder="Matériel retenu, mesures réelles, points à vérifier…"
              />
            </div>
          </div>
        </section>
        <HabitatLibrary
          local={library.local}
          cloud={library.cloud}
          busy={busy}
          message={library.message}
          signedIn={!!token}
          name={name}
          onName={(value) => {
            setName(value);
            setDraftTouched(true);
          }}
          onSave={(storage, copy) => void save(storage, copy)}
          onLoad={(project, storage) => {
            if (canReplace()) {
              apply(project.snapshot, project.name, { project, storage });
              setNotice('Projet ouvert.');
            }
          }}
          onRemove={(project, storage) => void remove(project, storage)}
          onReload={() => void library.reload()}
          currentId={current?.project.id}
          unsaved={unsaved || dirty}
        />
        <div hidden aria-hidden="true">
          <HabitatPlan
            dimensions={snapshot.dimensions}
            items={items}
            profile={shownProfile}
            exportId="habitat-export-plan"
          />
        </div>
        <HabitatPrint name={name} snapshot={snapshot} />
      </div>
    </div>
  );
}
