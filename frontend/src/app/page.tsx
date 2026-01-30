'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await api.searchSpecies(query);
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-emerald-700 dark:text-emerald-400 mb-4">
            Captivia
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Guide complet de la détention en captivité
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une espèce (ex: boa constrictor)..."
              className="w-full px-6 py-4 text-lg rounded-full border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-800 shadow-lg focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full transition-colors"
            >
              Rechercher
            </button>
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((species: any) => (
              <div
                key={species.key}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {species.canonicalName || species.scientificName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {species.scientificName}
                  </p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                      {species.rank}
                    </span>
                    {species.iucnRedListCategory && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm">
                        {species.iucnRedListCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sample species for demo */}
        {!loading && results.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Espèces populaires
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Boa Constrictor
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Boa constrictor
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Iguane vert
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Iguana iguana
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Serpent corail
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Micrurus corallinus
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Gecko léopard
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Eublepharis macularius
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Caiman crocodile
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Caiman crocodilus
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Tortue d'eau
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Trachemys scripta
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-sm">
                  species
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}