import { getProfile } from '@/lib/habitat/planner';
import { checklistFor, type HabitatSnapshot } from '@/lib/habitat/workspace';
import { HabitatPlan } from './HabitatPlan';
export function HabitatPrint({ name, snapshot }: { name: string; snapshot: HabitatSnapshot }) {
  const profile = getProfile(snapshot.profileId)!;
  return (
    <article id="habitat-print" lang="fr">
      <header>
        <p>CAPTIVIA · PLAN D’AMÉNAGEMENT</p>
        <h1>{name}</h1>
        <h2>{profile.name}</h2>
        <p>
          {snapshot.dimensions.width} × {snapshot.dimensions.depth} × {snapshot.dimensions.height}{' '}
          cm intérieurs · {profile.occupancy}
        </p>
      </header>
      <HabitatPlan dimensions={snapshot.dimensions} items={snapshot.items} profile={profile} />
      <h2>Repères du plan</h2>
      <ol>
        {snapshot.items.map((item) => (
          <li key={item.id}>
            <strong>{item.label}</strong> — {item.reason}
            <br />
            <small>
              Dimensions : {item.size.map((n) => Math.round(n * 1000) / 10).join(' × ')} cm ; centre
              X / Y / Z : {item.position.map((n) => Math.round(n * 1000) / 10).join(' / ')} cm.
            </small>
          </li>
        ))}
      </ol>
      <h2>Conditions et préparation</h2>
      {profile.parameters.map((parameter) => (
        <p key={parameter.label}>
          <strong>
            {parameter.label} : {parameter.value}.
          </strong>{' '}
          {parameter.context}
        </p>
      ))}
      <p>{profile.care}</p>
      <p>{profile.substrate}</p>
      <h2>Liste de matériel</h2>
      <ul>
        {checklistFor(snapshot).map((item) => (
          <li key={item.id}>
            [{snapshot.checked.includes(item.id) ? '✓' : ' '}] {item.label}
          </li>
        ))}
      </ul>
      {snapshot.notes && (
        <>
          <h2>Notes</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{snapshot.notes}</p>
        </>
      )}
      <footer>
        <p>
          Aménagement indicatif : ne simule ni chaleur, UVB ni circulation d’eau. Vérifier
          dimensions utiles, stabilité, distances de sécurité et notices. Les dimensions du modèle
          ne remplacent pas une évaluation de l’animal réel.
        </p>
        <p>
          Source : {profile.source.title} — {profile.source.url}
        </p>
        <p>
          Décors : Poly Haven (polyhaven.com), ambientCG (ambientcg.com), Kenney Nature Kit
          (kenney.nl) · CC0
        </p>
      </footer>
    </article>
  );
}
