'use client';
import { useState } from 'react';
import { Cloud, Copy, FolderOpen, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { HabitatProject } from '@/lib/habitat/workspace';
import { getProfile } from '@/lib/habitat/planner';
export type ProjectStorage = 'local' | 'cloud';
export function HabitatLibrary({
  local,
  cloud,
  busy,
  message,
  signedIn,
  name,
  onName,
  onSave,
  onLoad,
  onRemove,
  onReload,
  currentId,
  unsaved,
}: {
  local: HabitatProject[];
  cloud: HabitatProject[];
  busy: boolean;
  message: string;
  signedIn: boolean;
  name: string;
  onName: (name: string) => void;
  onSave: (storage: ProjectStorage, copy: boolean) => void;
  onLoad: (project: HabitatProject, storage: ProjectStorage) => void;
  onRemove: (project: HabitatProject, storage: ProjectStorage) => void;
  onReload: () => void;
  currentId?: string;
  unsaved: boolean;
}) {
  const [pendingDelete, setPendingDelete] = useState('');
  return (
    <section className="habitat-panel habitat-library" aria-label="Bibliothèque de projets">
      <div className="habitat-library-heading">
        <div className="habitat-step">
          <span>05</span>
          <h2>Mes projets d’habitat</h2>
        </div>
        <span className="habitat-save-state">
          {unsaved ? 'Modifications non enregistrées' : 'Projet à jour'}
        </span>
      </div>
      <div className="habitat-library-form">
        <label htmlFor="habitat-project-name">
          Nom du projet
          <input
            id="habitat-project-name"
            value={name}
            maxLength={80}
            onChange={(event) => onName(event.target.value)}
            placeholder="Ex. Terrarium de Léon"
          />
        </label>
        <div>
          <button
            type="button"
            className="habitat-button primary"
            disabled={busy}
            onClick={() => onSave('local', false)}
          >
            <Save size={15} />
            Enregistrer ici
          </button>
          <button
            type="button"
            className="habitat-button"
            disabled={busy || !signedIn}
            onClick={() => onSave('cloud', false)}
          >
            <Cloud size={15} />
            Enregistrer dans mon compte
          </button>
          <button
            type="button"
            className="habitat-button"
            disabled={busy}
            onClick={() => onSave(signedIn ? 'cloud' : 'local', true)}
          >
            <Copy size={15} />
            Enregistrer une copie
          </button>
        </div>
      </div>
      <p className="habitat-small">
        « Ici » conserve le projet dans ce navigateur. Les projets du compte peuvent être repris sur
        vos autres appareils après connexion.
      </p>
      {message && (
        <p role="status" className="habitat-callout">
          {message}
        </p>
      )}
      <div className="habitat-library-columns">
        {(
          [
            ['local', 'Sur cet appareil', local],
            ['cloud', 'Dans mon compte', cloud],
          ] as const
        ).map(([storage, label, projects]) => (
          <div key={storage}>
            <div className="habitat-library-subheading">
              <h3>{label}</h3>
              {storage === 'cloud' && signedIn && (
                <button
                  type="button"
                  className="habitat-button"
                  disabled={busy}
                  onClick={onReload}
                  aria-label="Actualiser les projets du compte"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            {storage === 'cloud' && !signedIn ? (
              <p className="habitat-small">
                Connectez-vous pour retrouver vos projets sur plusieurs appareils.
              </p>
            ) : projects.length === 0 ? (
              <p className="habitat-small">
                {busy && storage === 'cloud' ? 'Chargement…' : 'Aucun projet enregistré.'}
              </p>
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className={`habitat-project-card ${currentId === project.id ? 'is-current' : ''}`}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <p>{getProfile(project.snapshot.profileId)?.name}</p>
                    <small>
                      {project.snapshot.dimensions.width} × {project.snapshot.dimensions.depth} ×{' '}
                      {project.snapshot.dimensions.height} cm ·{' '}
                      {new Date(project.updatedAt).toLocaleDateString('fr-BE')}
                    </small>
                  </div>
                  {pendingDelete === project.id ? (
                    <div
                      className="habitat-project-delete"
                      role="group"
                      aria-label={`Confirmer la suppression de ${project.name}`}
                    >
                      <span>Supprimer ce projet ?</span>
                      <button
                        type="button"
                        className="habitat-button"
                        disabled={busy}
                        onClick={() => {
                          onRemove(project, storage);
                          setPendingDelete('');
                        }}
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        className="habitat-button"
                        onClick={() => setPendingDelete('')}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="habitat-project-card-actions">
                      <button
                        type="button"
                        className="habitat-button"
                        disabled={busy}
                        onClick={() => onLoad(project, storage)}
                      >
                        <FolderOpen size={14} />
                        Ouvrir
                      </button>
                      <button
                        type="button"
                        className="habitat-button"
                        disabled={busy}
                        aria-label={`Supprimer ${project.name}`}
                        onClick={() => setPendingDelete(project.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
