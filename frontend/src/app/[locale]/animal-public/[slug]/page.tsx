'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AnimalPublicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const t = useTranslations();
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<{
    name: string;
    speciesId: number;
    birthDate?: string;
    sex?: string;
    photos: string[];
    notes?: string;
    healthRecords: Array<{ id: string; type: string; title: string; date: string; notes?: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api
      .getPublicAnimal(slug)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [slug]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getHealthTypeName = (type: string) => {
    const key = `animals.healthRecordTypes.${type}` as any;
    try {
      return t(key);
    } catch {
      return type;
    }
  };

  if (loading || !slug) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-4" />
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            {error || 'Animal introuvable.'}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            {t('common.home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Photo + name */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold shrink-0 overflow-hidden ring-2 ring-white/30">
                {data.photos?.[0] ? (
                  <img src={data.photos[0]} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  data.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{data.name}</h1>
                {data.birthDate && (
                  <p className="text-white/90 text-sm">
                    {t('animals.birthDate')}: {formatDate(data.birthDate)}
                  </p>
                )}
                {data.sex && (
                  <p className="text-white/90 text-sm">
                    {t('animals.sex')}: {data.sex === 'male' ? t('animals.male') : data.sex === 'female' ? t('animals.female') : t('animals.unknown')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {data.notes && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{t('animals.notes')}</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">{t('animalPublic.healthRecord')}</h2>
              {data.healthRecords.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('animalPublic.noRecords')}</p>
              ) : (
                <ul className="space-y-3">
                  {data.healthRecords.map((r) => (
                    <li
                      key={r.id}
                      className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                    >
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {getHealthTypeName(r.type)}
                      </span>
                      <p className="font-medium text-gray-800 dark:text-white mt-1">{r.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(r.date)}</p>
                      {r.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{r.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t('common.appName')} — page publique (lecture seule)
        </p>
      </div>
    </div>
  );
}
