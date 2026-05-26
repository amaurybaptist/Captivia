import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const animal = await prisma.animal.findFirst();
  if (!animal) {
    console.log('No animal found. Run seed first.');
    return;
  }

  console.log(`Adding health records to: ${animal.name} (${animal.id})`);

  const records = [
    {
      animalId: animal.id,
      type: 'vaccine',
      title: 'Vaccin antiparasitaire',
      date: new Date('2024-03-15'),
      notes: 'Traitement préventif contre les parasites internes',
      details: { vet: 'Dr. Martin', nextReminder: '2025-03-15' },
    },
    {
      animalId: animal.id,
      type: 'medical_history',
      title: 'Visite de routine',
      date: new Date('2024-06-01'),
      notes: 'Bonne santé générale. Poids stable. Mue récente sans problème.',
      details: { vet: 'Dr. Martin', weight: '65g' },
    },
    {
      animalId: animal.id,
      type: 'specific_food',
      title: 'Régime calcium renforcé',
      date: new Date('2024-07-10'),
      notes: 'Ajout de calcium D3 saupoudré sur les insectes 3x/semaine',
      details: { product: 'Repashy Calcium Plus', frequency: '3x/semaine' },
    },
    {
      animalId: animal.id,
      type: 'surgery',
      title: 'Ablation kyste cutané',
      date: new Date('2025-01-20'),
      notes: 'Petit kyste bénin retiré sous anesthésie locale. Guérison complète en 10 jours.',
      details: { vet: 'Dr. Dupont', clinic: 'Clinique NAC Paris', recovery: '10 jours' },
    },
    {
      animalId: animal.id,
      type: 'vaccine',
      title: 'Traitement anti-acariens',
      date: new Date('2025-04-05'),
      notes: 'Application préventive suite à contact avec nouvel animal',
      details: { product: 'Frontline spray reptile', nextReminder: '2025-10-05' },
    },
  ];

  for (const record of records) {
    await prisma.animalHealthRecord.create({ data: record });
  }

  console.log(`Created ${records.length} health records`);
}

main().finally(() => prisma.$disconnect());
