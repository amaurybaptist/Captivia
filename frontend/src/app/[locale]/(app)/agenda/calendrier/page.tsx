import type { Metadata } from 'next';
import CareAgenda from '@/components/agenda/CareAgenda';
export const metadata: Metadata = {
  title: 'Agenda des soins | Captivia',
  description: 'Le calendrier des routines, traitements, vaccins et rendez-vous de vos animaux.',
};
export default function AgendaPage() {
  return <CareAgenda />;
}
