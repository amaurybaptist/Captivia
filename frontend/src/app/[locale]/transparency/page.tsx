'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function TransparencyPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">
          {t('footer.transparency')}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 space-y-8 break-words">
          {/* Section: Notre Mission */}
          <section>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Notre Mission
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Captivia est une plateforme complète, pédagogique et bienveillante
              qui accompagne les propriétaires d'animaux domestiques et NAC (Nouveaux
              Animaux de Compagnie) au quotidien. Notre objectif est de fournir
              des informations fiables, accessibles et à jour sans se substituer
              à un vétérinaire.
            </p>
          </section>

          {/* Section: Modèle Économique */}
          <section>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Notre Modèle Économique
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Captivia est gratuit pour consulter le catalogue d'espèces et les
              informations associées (santé, législation, alimentation, matériel).
              Pour financer le développement et la maintenance de la plateforme,
              nous utilisons deux sources de revenus :
            </p>
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  1. Affiliation (dès maintenant)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Nous recommandons du matériel et de l'alimentation via des liens
                  affiliés (principalement Amazon). Lorsque vous achetez un produit
                  via ces liens, nous recevons une petite commission sans coût
                  supplémentaire pour vous. Tous les liens affiliés sont clairement
                  identifiés par un badge "Lien affilié".
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  2. Abonnement Premium (à venir)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  À l'avenir, nous proposerons un abonnement premium pour accéder
                  à des fonctionnalités avancées :
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>Gestion d'animaux illimitée (1 gratuit, au-delà = abonnement)</li>
                  <li>Rappels avancés et personnalisés</li>
                  <li>Statistiques détaillées</li>
                  <li>Export de données</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section: Transparence des Liens Affiliés */}
          <section>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Transparence des Liens Affiliés
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Identification claire :</strong> Tous les liens affiliés
                sont marqués d'un badge "Lien affilié" visible.
              </p>
              <p>
                <strong>Aucun coût supplémentaire :</strong> Le prix des produits
                est identique, que vous passiez par notre lien ou non.
              </p>
              <p>
                <strong>Recommandations honnêtes :</strong> Nous recommandons
                uniquement du matériel que nous jugeons adapté et de qualité.
                L'affiliation ne compromet jamais notre intégrité.
              </p>
              <p>
                <strong>Partenaires :</strong> Amazon (mondial), et à terme
                d'autres enseignes spécialisées.
              </p>
            </div>
          </section>

          {/* Section: Protection des Données */}
          <section>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Protection de Vos Données
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Nous prenons la confidentialité de vos données très au sérieux :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                Les données de vos animaux (nom, âge, photos, notes) sont privées
                et ne sont jamais partagées.
              </li>
              <li>
                Aucune vente de données personnelles à des tiers.
              </li>
              <li>
                Conformité RGPD (Europe) et réglementations locales.
              </li>
              <li>
                Vous pouvez supprimer votre compte et toutes vos données à tout moment.
              </li>
            </ul>
          </section>

          {/* Section: Open Data */}
          <section>
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Engagement Open Data
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Captivia s'appuie sur des sources de données ouvertes et fiables :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>GBIF</strong> (Global Biodiversity Information Facility)
                - Données taxonomiques et distribution
              </li>
              <li>
                <strong>Species+</strong> (CITES) - Législation et commerce
                international
              </li>
              <li>
                <strong>PubMed</strong> - Références scientifiques santé
              </li>
              <li>
                <strong>Open Pet Food Facts</strong> - Composition alimentaire
              </li>
              <li>
                <strong>LafeberVet, IVIS</strong> - Ressources vétérinaires NAC
              </li>
            </ul>
          </section>

          {/* Section: Contact */}
          <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              Contact
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Pour toute question concernant notre modèle économique, l'affiliation,
              ou la protection des données, n'hésitez pas à nous contacter :
            </p>
            <p className="mt-3 text-emerald-600 dark:text-emerald-400 font-semibold">
              contact@captivia.com (exemple)
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {t('common.back')} {t('common.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
