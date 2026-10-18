'use client';
import { LockKeyhole, Plus, RotateCcw, Trash2, UnlockKeyhole } from 'lucide-react';
import { CATALOG, isRequired } from '@/lib/habitat/workspace';
import type { HabitatItem, HabitatProfile } from '@/lib/habitat/planner';

export function HabitatEditor({
  item,
  profile,
  onChange,
  onRemove,
  onReset,
  onAdd,
  disabled,
}: {
  item?: HabitatItem;
  profile: HabitatProfile;
  onChange: (item: HabitatItem) => void;
  onRemove: () => void;
  onReset: () => void;
  onAdd: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="habitat-panel habitat-editor" aria-label="Édition de l’aménagement">
      <div className="habitat-step">
        <span>03</span>
        <h2>Personnaliser l’agencement</h2>
      </div>
      <p className="habitat-small">
        Sélectionnez un élément dans la scène, le plan ou la liste. Déplacez-le avec les poignées
        3D, ou entrez ses coordonnées ci-dessous.
      </p>
      {item ? (
        <>
          <div className="habitat-editor-title">
            <strong>{item.label}</strong>
            <button
              type="button"
              className="habitat-button"
              disabled={disabled}
              aria-pressed={item.locked}
              onClick={() => onChange({ ...item, locked: !item.locked })}
            >
              {item.locked ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}
              {item.locked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
          {item.locked && (
            <p className="habitat-callout">
              Élément verrouillé pour éviter les déplacements accidentels. Déverrouillez-le pour
              modifier sa position.
            </p>
          )}
          <fieldset disabled={disabled || item.locked} className="habitat-editor-fields">
            <legend>Position du centre, depuis le centre de la cuve (cm)</legend>
            <div>
              {(['X', 'Hauteur', 'Profondeur'] as const).map((label, index) => (
                <label key={label}>
                  {label}
                  <input
                    aria-label={`Position ${label}`}
                    type="number"
                    step="1"
                    value={Math.round(item.position[index] * 1000) / 10}
                    onChange={(event) => {
                      if (event.target.value === '') return;
                      const n = Number(event.target.value);
                      if (!Number.isFinite(n)) return;
                      const position = [...item.position] as [number, number, number];
                      position[index] = n / 100;
                      onChange({ ...item, position });
                    }}
                  />
                </label>
              ))}
            </div>
            <label>
              Rotation horizontale (°)
              <input
                type="range"
                min="-180"
                max="180"
                step="15"
                value={Math.round((item.rotation * 180) / Math.PI)}
                onChange={(event) =>
                  onChange({ ...item, rotation: (Number(event.target.value) * Math.PI) / 180 })
                }
              />
              <output>{Math.round((item.rotation * 180) / Math.PI)}°</output>
            </label>
            <p className="habitat-small">Dimensions réelles de l’élément (cm)</p>
            <div>
              {(['Largeur', 'Hauteur', 'Profondeur'] as const).map((label, index) => (
                <label key={label}>
                  {label}
                  <input
                    aria-label={`Dimension ${label} de l’élément`}
                    type="number"
                    min="0.5"
                    max="300"
                    step="0.5"
                    value={Math.round(item.size[index] * 1000) / 10}
                    onChange={(event) => {
                      if (event.target.value === '') return;
                      const n = Number(event.target.value);
                      if (!Number.isFinite(n) || n < 0.5 || n > 300) return;
                      const size = [...item.size] as [number, number, number];
                      size[index] = n / 100;
                      onChange({ ...item, size });
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="habitat-editor-actions">
            <button
              type="button"
              className="habitat-button"
              disabled={disabled || item.custom}
              onClick={onReset}
            >
              <RotateCcw size={14} />
              Placement initial
            </button>
            <button
              type="button"
              className="habitat-button"
              disabled={disabled || isRequired(item, profile)}
              onClick={onRemove}
            >
              <Trash2 size={14} />
              Retirer
            </button>
          </div>
          {isRequired(item, profile) && (
            <p className="habitat-small">
              Cet élément fait partie des fonctions indispensables du modèle. Il peut être déplacé
              mais pas supprimé.
            </p>
          )}
        </>
      ) : (
        <p className="habitat-callout">Choisissez un élément pour ouvrir ses réglages.</p>
      )}
      <h3 className="habitat-subheading">Ajouter au décor</h3>
      <div className="habitat-catalog">
        {CATALOG.filter((entry) => entry.environments.includes(profile.layout)).map((entry) => (
          <button
            type="button"
            key={entry.key}
            className="habitat-button"
            disabled={disabled}
            onClick={() => onAdd(entry.key)}
          >
            <Plus size={14} />
            {entry.label}
          </button>
        ))}
      </div>
      <p className="habitat-small">
        Les dimensions sont ramenées dans la cuve. La compatibilité réelle des plantes, matériaux et
        produits doit être vérifiée avant achat.
      </p>
    </section>
  );
}
