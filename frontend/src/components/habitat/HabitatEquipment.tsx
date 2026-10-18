'use client';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { checklistFor, downloadFile, type HabitatSnapshot } from '@/lib/habitat/workspace';
import { getProfile } from '@/lib/habitat/planner';

type Store = { id: string; name: string; url: string; description?: string };
type Product = { title: string; url: string; price?: string };
type Recommendation = { id: string; label: string; products?: Product[] };
const https = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
};
export function HabitatEquipment({
  snapshot,
  speciesId,
  onCheck,
}: {
  snapshot: HabitatSnapshot;
  speciesId?: number;
  onCheck: (id: string) => void;
}) {
  const profile = getProfile(snapshot.profileId)!;
  const [data, setData] = useState<{
    key: string;
    stores: Store[];
    recommendations: Recommendation[];
    error: boolean;
  }>({ key: '', stores: [], recommendations: [], error: false });
  const key = `${profile.id}:${speciesId || ''}`;
  const checklist = checklistFor(snapshot);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      api.getAffiliateStores(profile.category),
      speciesId ? api.getRecommendedEquipment(speciesId) : Promise.resolve(null),
    ]).then(([stores, equipment]) => {
      if (!active) return;
      const value =
        equipment.status === 'fulfilled'
          ? (equipment.value as { recommendations?: Recommendation[] } | null)
          : null;
      setData({
        key,
        stores: stores.status === 'fulfilled' && Array.isArray(stores.value) ? stores.value : [],
        recommendations: Array.isArray(value?.recommendations)
          ? value.recommendations.filter(
              (rec) =>
                Array.isArray(rec.products) &&
                rec.products.some((p) => typeof p.url === 'string' && https(p.url))
            )
          : [],
        error: stores.status === 'rejected' || equipment.status === 'rejected',
      });
    });
    return () => {
      active = false;
    };
  }, [key, profile.category, speciesId]);
  const current = data.key === key ? data : null;
  function exportList() {
    // Quoting alone does not prevent spreadsheet formulas from untrusted labels.
    const cell = (s: string) =>
      `"${(/^[\s]*[=+@\-\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
    const rows = [
      ['Élément / ensemble', 'À vérifier', 'Préparé'],
      ...checklist.map((item) => [
        item.label,
        item.detail,
        snapshot.checked.includes(item.id) ? 'Oui' : 'Non',
      ]),
    ];
    downloadFile(
      new Blob(['\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
      `captivia-materiel-${snapshot.profileId}.csv`
    );
  }
  return (
    <section className="habitat-panel habitat-equipment-checklist" aria-label="Liste de matériel">
      <div className="habitat-step">
        <span>04</span>
        <h2>Matériel et préparation</h2>
      </div>
      <p className="habitat-small">
        {checklist.filter((item) => snapshot.checked.includes(item.id)).length} / {checklist.length}{' '}
        éléments préparés. Cocher un équipement ne valide pas les conditions de vie réelles.
      </p>
      <div className="habitat-checklist">
        {checklist.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={snapshot.checked.includes(item.id)}
              onChange={() => onCheck(item.id)}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </label>
        ))}
      </div>
      <button type="button" className="habitat-button" onClick={exportList}>
        Exporter la liste de matériel
      </button>
      <h3 className="habitat-subheading">Où trouver le matériel</h3>
      {!current ? (
        <p className="habitat-small" role="status">
          Recherche des magasins disponibles…
        </p>
      ) : (
        <>
          {current.error && (
            <p className="habitat-small">Certains liens ne sont pas disponibles pour le moment.</p>
          )}
          {current.recommendations.map((rec) => (
            <div key={rec.id} className="habitat-product-group">
              <strong>{rec.label}</strong>
              {rec.products
                ?.filter((p) => https(p.url))
                .map((product) => (
                  <a
                    key={product.url}
                    href={https(product.url)!}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    {product.title}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ))}
            </div>
          ))}
          <div className="habitat-store-links">
            {current.stores
              .filter((store) => https(store.url))
              .map((store) => (
                <a
                  key={store.id}
                  href={https(store.url)!}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  {store.name}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ))}
          </div>
          {!current.stores.length && !current.recommendations.length && (
            <p className="habitat-small">
              Aucune référence marchande disponible pour ce modèle. La liste ci-dessus reste
              utilisable chez le fournisseur de votre choix.
            </p>
          )}
        </>
      )}
      <p className="habitat-small">
        Liens pouvant être affiliés. Vérifiez dimensions, compatibilité et notices : une référence
        marchande ne constitue pas une validation de l’installation.
      </p>
    </section>
  );
}
