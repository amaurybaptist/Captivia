import type { Metadata } from 'next';
import { Suspense } from 'react';
import GuideClient from './GuideClient';

export const metadata: Metadata = {
  title: 'Concepteur d’habitat 3D | Captivia',
  description:
    'Entrez les dimensions de votre cuve et découvrez un aménagement 3D pour votre animal.',
};
export default function GuidePage() {
  return <Suspense fallback={null}><GuideClient /></Suspense>;
}
