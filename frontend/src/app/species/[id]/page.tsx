'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function SpeciesDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [species, setSpecies] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpecies();
  }, [id]);

  const loadSpecies = async () => {
    try {
      setLoading(true);
      const [speciesData, mediaData, iucnData] = await Promise.all([
        api.getSpecies(id),
        api.getMedia(id),
        api.getIucn(id),
      ]);
      setSpecies({
        ...speciesData,
        media: mediaData.results || [],
        iucn: iucnData,
      });
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !species) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {error || 'Espèce non trouvée'}
          </h2>
          <button
            onClick={() => router.push('/')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          ← Retour à la recherche
        </button>

        {/* Species header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {species.media[0] && (
              <div className="md:w-1/3">
                <img
                  src={species.media[0].identifier}
                  alt={species.canonicalName || species.scientificName}
                  className="w-full h-64 object-cover rounded-xl"
                />
              </div>
            )}
            <div className="md:w-2/3">
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                {species.canonicalName || species.scientificName}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
                {species.scientificName}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  {species.rank}
                </span>
                {species.kingdom && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                    {species.kingdom}
                  </span>
                )}
                {species.phylum && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                    {species.phylum}
                  </span>
                )}
                {species.iucnRedListCategory && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                    IUCN: {species.iucnRedListCategory}
                  </span>
                )}
              </div>
              {species.taxonomicStatus && (
                <p className="text-gray-600 dark:text-gray-300">
                  Statut taxonomique: {species.taxonomicStatus}
                </p>
              )}
              {species.origin && (
                <p className="text-gray-600 dark:text-gray-300">
                  Origine: {species.origin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Media gallery */}
        {species.media.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Galerie média
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {species.media.map((media: any, index: number) => (
                <img
                  key={index}
                  src={media.identifier}
                  alt={media.type}
                  className="w-full h-48 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </div>
          </div>
        )}

        {/* IUCN information */}
        {species.iucn && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Statut IUCN
            </h2>
            <div className="flex items-center gap-4">
              <div className={`px-6 py-3 rounded-full text-white text-lg font-bold ${
                species.iucnRedListCategory?.includes('Extinct') 
                  ? 'bg-red-600' 
                  : species.iucnRedListCategory?.includes('Endangered')
                  ? 'bg-orange-600'
                  : species.iucnRedListCategory?.includes('Vulnerable')
                  ? 'bg-yellow-600'
                  : 'bg-green-600'
              }`}>
                {species.iucnRedListCategory}
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Catégorie de menace selon l'Union Internationale pour la Conservation de la Nature
              </p>
            </div>
          </div>
        )}

        {/* Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Distribution
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Cette espèce est présente dans plusieurs pays. Consultez les données de l'UICN pour plus de détails.
          </p>
          <a
            href={`https://www.gbif.org/species/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Voir sur GBIF →
          </a>
        </div>

        {/* Additional information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Informations supplémentaires
          </h2>
          <div className="grid gap-4">
            {species.nomenclaturalCode && (
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Code nomenclatural
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{species.nomenclaturalCode}</p>
              </div>
            )}
            {species.taxonRank && (
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Rang taxonomique
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{species.taxonRank}</p>
              </div>
            )}
            {species.numChildren && (
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre d'espèces apparentées
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{species.numChildren}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}