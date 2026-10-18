import type { Metadata } from 'next';
import HabitatAccess from '@/components/habitat/HabitatAccess';

export const metadata: Metadata = {
  title: 'Concepteur d’habitat 3D | Captivia',
  description:
    'Entrez les dimensions de votre cuve et découvrez un aménagement 3D pour votre animal.',
};
export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ animal?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  return (
    <HabitatAccess
      locale={locale}
      initialAnimalId={typeof query.animal === 'string' ? query.animal : ''}
    />
  );
}
