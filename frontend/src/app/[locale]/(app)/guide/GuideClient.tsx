'use client';

import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import HabitatAccess from '@/components/habitat/HabitatAccess';

export default function GuideClient() {
  const locale = useLocale();
  const query = useSearchParams();
  return <HabitatAccess locale={locale} initialAnimalId={query.get('animal') ?? ''} />;
}
