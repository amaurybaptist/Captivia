'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Box, Crown, FolderHeart, LockKeyhole, Ruler } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBase } from '@/lib/api';
import './habitat.css';

const Planner = dynamic(() => import('./HabitatPlanner'), {
  ssr: false,
  loading: () => (
    <p role="status" className="habitat-access-loading">
      Ouverture de votre atelier Premium…
    </p>
  ),
});
type Access = { token: string; userId: string; status: 'premium' | 'free' | 'error' };

export default function HabitatAccess({
  locale,
  initialAnimalId = '',
}: {
  locale: string;
  initialAnimalId?: string;
}) {
  const { user, token, isLoading } = useAuth();
  const userId = user?.id;
  const [access, setAccess] = useState<Access | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token || !userId) return;
    let active = true,
      sequence = 0;
    let pending: AbortController | undefined;
    const store = (status: Access['status']) => setAccess({ token, userId, status });
    async function verify() {
      const version = ++sequence;
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${getApiBase()}/auth/me`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active || version !== sequence) return;
        if (response.status === 401 || response.status === 403) {
          store('free');
          return;
        }
        if (!response.ok) throw new Error('Access unavailable');
        const profile: unknown = await response.json();
        if (!active || version !== sequence) return;
        if (
          !profile ||
          typeof profile !== 'object' ||
          !('id' in profile) ||
          profile.id !== userId ||
          !('isPremium' in profile) ||
          typeof profile.isPremium !== 'boolean'
        )
          throw new Error('Invalid profile');
        store(profile.isPremium ? 'premium' : 'free');
      } catch {
        if (active && version === sequence) store('error');
      } finally {
        clearTimeout(timer);
      }
    }
    const refresh = () => {
      if (document.visibilityState !== 'hidden') void verify();
    };
    const lock = () => {
      ++sequence;
      pending?.abort();
      store('free');
    };
    void verify();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('habitat:premium-required', lock);
    return () => {
      active = false;
      pending?.abort();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('habitat:premium-required', lock);
    };
  }, [token, userId, user?.isPremium, retry]);

  const current =
    token && userId && access?.token === token && access.userId === userId ? access.status : null;
  if (isLoading || (token && userId && current === null))
    return (
      <div className="habitat-page">
        <p role="status" className="habitat-access-loading">
          Vérification de votre accès Premium…
        </p>
      </div>
    );
  if (current === 'premium')
    return <Planner key={userId} locale={locale} initialAnimalId={initialAnimalId} />;
  if (current === 'error')
    return (
      <div className="habitat-page" lang="fr">
        <section className="habitat-access-error habitat-panel" aria-label="Vérification Premium">
          <h1>Impossible de vérifier votre accès</h1>
          <p role="alert">
            Votre abonnement n’a pas pu être vérifié. Réessayez lorsque la connexion sera
            disponible.
          </p>
          <button
            className="habitat-button primary"
            onClick={() => {
              setAccess(null);
              setRetry((value) => value + 1);
            }}
          >
            Réessayer
          </button>
        </section>
      </div>
    );
  return (
    <div className="habitat-page" lang="fr">
      <div className="habitat-container habitat-premium-access">
        <header className="habitat-intro">
          <div>
            <span className="habitat-eyebrow">
              <Crown size={16} aria-hidden="true" /> CAPTIVIA PREMIUM
            </span>
            <h1>
              Son futur habitat,
              <br />
              <em>imaginé en 3D.</em>
            </h1>
            <p>
              Préparez un terrarium, un vivarium ou un aquarium adapté à son espèce, puis
              personnalisez chaque détail de son aménagement.
            </p>
          </div>
        </header>
        <section
          className="habitat-panel habitat-premium-card"
          aria-labelledby="habitat-premium-title"
        >
          <div className="habitat-premium-mark" aria-hidden="true">
            <Box size={64} strokeWidth={1.3} />
            <LockKeyhole size={22} />
          </div>
          <div>
            <span className="habitat-eyebrow">LE CONCEPTEUR D’HABITAT</span>
            <h2 id="habitat-premium-title">Un atelier réservé aux membres Premium</h2>
            <p>
              La génération d’aménagements, l’édition 2D et 3D, les projets sauvegardés et les
              exports font partie de votre abonnement Premium.
            </p>
            <Link className="habitat-button primary" href={`/${locale}/parametres/abonnement`}>
              Découvrir Premium <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {!token && (
              <Link className="habitat-premium-login" href={`/${locale}/login`}>
                Déjà membre ? Se connecter
              </Link>
            )}
          </div>
        </section>
        <div className="habitat-premium-benefits">
          <article className="habitat-panel">
            <Ruler size={24} aria-hidden="true" />
            <h3>À vos dimensions</h3>
            <p>
              Renseignez les dimensions intérieures de votre cuve et obtenez une proposition pour
              l’espèce choisie.
            </p>
          </article>
          <article className="habitat-panel">
            <Box size={24} aria-hidden="true" />
            <h3>Explorez et personnalisez</h3>
            <p>
              Déplacez les décors, ajustez leurs dimensions et alternez entre le plan 2D et la vue
              3D.
            </p>
          </article>
          <article className="habitat-panel">
            <FolderHeart size={24} aria-hidden="true" />
            <h3>Gardez vos projets</h3>
            <p>
              Retrouvez vos aménagements dans votre compte et exportez les plans, images et listes
              de matériel.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
