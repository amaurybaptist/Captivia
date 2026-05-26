'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getTaxonomyLabel } from '@/lib/taxonomy';
import Link from 'next/link';

export default function Home() {
  const t = useTranslations();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsTimeout, setSuggestionsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && !selectedTypeFilter) return;
    setShowSuggestions(false);

    setLoading(true);
    setSearchError(null);
    try {
      // Use a generic query for filter-only searches
      const searchQuery = query.trim() || 'animal';
      const filters: any = {};
      if (selectedTypeFilter) {
        filters.class = selectedTypeFilter;
      }
      
      const data = await api.searchSpecies(searchQuery, 20, 0, filters);
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Le serveur de recherche est indisponible. Démarrez le backend ou réessayez plus tard.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Clear previous timeout
    if (suggestionsTimeout) {
      clearTimeout(suggestionsTimeout);
    }
    
    if (value.trim().length > 2) {
      setSuggestionsLoading(true);
      setShowSuggestions(true);
      
      // Debounce suggestions search
      const timeout = setTimeout(async () => {
        try {
          const data = await api.searchSpecies(value, 8, 0);
          setSuggestions(data.results || []);
          setSuggestionsLoading(false);
        } catch (error) {
          console.error('Suggestions error:', error);
          setSuggestions([]);
          setSuggestionsLoading(false);
        }
      }, 300);
      
      setSuggestionsTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (species: any) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setResults([]);
  };

  const handleTypeFilter = async (classValue: string) => {
    const newFilter = selectedTypeFilter === classValue ? null : classValue;
    setSelectedTypeFilter(newFilter);
    setShowGallery(!!newFilter);

    // Auto-search when toggling filter
    setLoading(true);
    setSearchError(null);
    try {
      const searchQuery = query.trim() || 'animal';
      const filters: any = {};
      if (newFilter) {
        filters.class = newFilter;
      }
      
      const data = await api.searchSpecies(searchQuery, 20, 0, filters);
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearchError(
        error instanceof Error
          ? error.message
          : 'Le serveur de recherche est indisponible.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
        {/* Hero */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-700 dark:text-emerald-400 mb-4 sm:mb-5 tracking-tight">
            {t('common.appName')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 px-2 max-w-2xl mx-auto leading-relaxed">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mx-auto mb-10 sm:mb-14 relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder={t('home.searchPlaceholder')}
              className="w-full px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg rounded-2xl border-2 border-emerald-300 dark:border-emerald-600 bg-white dark:bg-gray-800 shadow-lg shadow-emerald-500/10 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
              aria-label={t('home.searchPlaceholder')}
            />
            <button
              type="submit"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-200"
            >
              {t('common.search')}
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/5 z-50 max-h-96 overflow-y-auto border border-gray-100 dark:border-gray-700">
              {suggestionsLoading && (
                <div className="p-5 text-center text-gray-500">
                  {t('common.loading')}...
                </div>
              )}
              {!suggestionsLoading && suggestions.map((species: any) => (
                <Link
                  key={species.key}
                  href={`/species/${species.key}`}
                  onClick={() => handleSuggestionClick(species)}
                  className="block px-5 sm:px-6 py-4 sm:py-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors duration-150"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                    {species.vernacularNames && species.vernacularNames.length > 0
                      ? species.vernacularNames[0]
                      : species.canonicalName || species.scientificName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {species.scientificName}
                  </p>
                  {species.class && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {getTaxonomyLabel(species.class)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Filtres par type — 2 colonnes, toute la place sous la barre de recherche */}
        <div className="w-full max-w-7xl mx-auto mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-5">
            <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">
              Filtrer par type d&apos;animal
            </p>
            {selectedTypeFilter && (
              <button
                onClick={() => {
                  setSelectedTypeFilter(null);
                  setShowGallery(false);
                  setResults([]);
                }}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-medium flex-shrink-0 transition-colors duration-200"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {[
              { label: 'Reptile', value: 'Reptilia', icon: '🦎' },
              { label: 'Oiseau', value: 'Aves', icon: '🦜' },
              { label: 'Mammifère', value: 'Mammalia', icon: '🐰' },
              { label: 'Amphibien', value: 'Amphibia', icon: '🐸' },
              { label: 'Poisson', value: 'Actinopterygii', icon: '🐠' },
              { label: 'Insecte', value: 'Insecta', icon: '🦗' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => handleTypeFilter(type.value)}
                className={`rounded-3xl border-2 min-h-[140px] sm:min-h-[180px] flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-8 transition-all duration-200 ease-out ${
                  selectedTypeFilter === type.value
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/25 scale-[1.02]'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg'
                }`}
              >
                <span className="text-5xl sm:text-7xl select-none" aria-hidden>{type.icon}</span>
                <span className="text-lg sm:text-xl font-semibold text-center leading-tight">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {t('common.loading')}
            </p>
          </div>
        )}

        {/* Search error (e.g. backend not running) */}
        {searchError && !loading && (
          <div className="max-w-2xl mx-auto mb-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <p className="text-sm sm:text-base text-amber-800 dark:text-amber-200 text-center">
              {searchError}
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {results.map((species: any) => (
              <Link
                key={species.key}
                href={`/species/${species.key}`}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-gray-100 dark:border-gray-700"
                data-testid="species-result"
              >
                <div className="p-5 sm:p-6">
                  {/* Common name as main title */}
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {species.vernacularNames && species.vernacularNames.length > 0
                      ? species.vernacularNames[0]
                      : species.canonicalName || species.scientificName}
                  </h2>
                  {/* Scientific name as subtitle */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {species.scientificName}
                  </p>
                  {/* Taxonomy info in common terms */}
                  {(species.class || species.order || species.family) && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      {species.class && <span>{getTaxonomyLabel(species.class)}</span>}
                      {species.class && species.order && <span> • </span>}
                      {species.order && <span>{species.order}</span>}
                      {(species.class || species.order) && species.family && <span> • </span>}
                      {species.family && <span>{species.family}</span>}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-full text-xs sm:text-sm">
                      {species.rank}
                    </span>
                    {species.iucnStatus && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs sm:text-sm">
                        {species.iucnStatus}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer - liens utiles */}
        <footer className="mt-14 sm:mt-20 pt-8 sm:pt-10 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap justify-center gap-5 sm:gap-6 text-sm text-gray-600 dark:text-gray-400 px-2">
            <Link href="/transparency" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
              {t('footer.transparency')}
            </Link>
            <Link href="/magasin" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
              {t('common.shop')}
            </Link>
            <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
              {t('common.home')}
            </Link>
            {user ? (
              <>
                <Link href="/mes-animaux" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
                  {t('common.myAnimals')}
                </Link>
                <Link href="/parametres" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
                  {t('common.settings')}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
                  {t('common.login')}
                </Link>
                <Link href="/register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150">
                  {t('common.register')}
                </Link>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
