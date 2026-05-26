import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GBIF species IDs
const SPECIES_IDS = {
  BOA_CONSTRICTOR: 2448340,
  IGUANA_IGUANA: 5220648,
  GECKO_LEOPARD: 5221172, // Eublepharis macularius
  TORTUE: 551789, // Trachemys scripta
  PYTHON_ROYAL: 7587934, // Python regius
};

// ============================================
// Validation helpers
// ============================================

interface SpeciesProfileData {
  speciesId: number;
  commonNameFr: string;
  scientificName: string;
  category: string;
  subcategory?: string;
  domesticationType: string;
  description?: string;
}

interface SpeciesFeedingData {
  speciesId: number;
  locale?: string;
  dietType: string;
  recommendedFoods: Array<{ name: string; frequency: string; notes?: string }>;
  foodsToAvoid: Array<{ name: string; reason: string }>;
  mealFrequency: string;
  specificNeeds?: string;
}

interface SpeciesHabitatData {
  speciesId: number;
  locale?: string;
  habitatType: string;
  tempMin: number;
  tempMax: number;
  humidityMin?: number;
  humidityMax?: number;
  minSpaceSize: string;
  lightNeeds: string;
  activityEnrichment: string;
  hygieneNotes?: string;
  costEstimate: string;
}

interface SpeciesBehaviorData {
  speciesId: number;
  locale?: string;
  generalBehavior: string;
  sociability: string;
  difficultyLevel: string;
  compatibilityWithChildren?: string;
  compatibilityWithOtherAnimals?: string;
}

function validateSpeciesProfile(data: SpeciesProfileData): boolean {
  if (!data.speciesId || !data.commonNameFr || !data.scientificName || !data.category || !data.domesticationType) {
    console.warn(`⚠️ Invalid SpeciesProfile: missing required fields for species ${data.speciesId}`);
    return false;
  }
  const validCategories = ['mammifère', 'reptile', 'amphibien', 'oiseau', 'poisson', 'insecte', 'arachnide'];
  if (!validCategories.includes(data.category)) {
    console.warn(`⚠️ Invalid category for species ${data.speciesId}: ${data.category}`);
    return false;
  }
  const validDomestication = ['domestique', 'semi-domestique', 'NAC'];
  if (!validDomestication.includes(data.domesticationType)) {
    console.warn(`⚠️ Invalid domesticationType for species ${data.speciesId}: ${data.domesticationType}`);
    return false;
  }
  return true;
}

function validateSpeciesFeeding(data: SpeciesFeedingData): boolean {
  if (!data.speciesId || !data.dietType || !data.mealFrequency || !Array.isArray(data.recommendedFoods) || !Array.isArray(data.foodsToAvoid)) {
    console.warn(`⚠️ Invalid SpeciesFeeding: missing required fields for species ${data.speciesId}`);
    return false;
  }
  return true;
}

function validateSpeciesHabitat(data: SpeciesHabitatData): boolean {
  if (!data.speciesId || !data.habitatType || data.tempMin === undefined || data.tempMax === undefined || !data.minSpaceSize || !data.lightNeeds || !data.activityEnrichment || !data.costEstimate) {
    console.warn(`⚠️ Invalid SpeciesHabitat: missing required fields for species ${data.speciesId}`);
    return false;
  }
  const validCosts = ['faible', 'moyen', 'élevé'];
  if (!validCosts.includes(data.costEstimate)) {
    console.warn(`⚠️ Invalid costEstimate for species ${data.speciesId}: ${data.costEstimate}`);
    return false;
  }
  return true;
}

function validateSpeciesBehavior(data: SpeciesBehaviorData): boolean {
  if (!data.speciesId || !data.generalBehavior || !data.sociability || !data.difficultyLevel) {
    console.warn(`⚠️ Invalid SpeciesBehavior: missing required fields for species ${data.speciesId}`);
    return false;
  }
  const validSociability = ['solitaire', 'grégaire', 'semi-grégaire'];
  if (!validSociability.includes(data.sociability)) {
    console.warn(`⚠️ Invalid sociability for species ${data.speciesId}: ${data.sociability}`);
    return false;
  }
  const validDifficulty = ['débutant', 'intermédiaire', 'expert'];
  if (!validDifficulty.includes(data.difficultyLevel)) {
    console.warn(`⚠️ Invalid difficultyLevel for species ${data.speciesId}: ${data.difficultyLevel}`);
    return false;
  }
  return true;
}

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================
  // 0. SpeciesProfile + Related data
  // ============================================
  console.log('📋 Seeding SpeciesProfiles and related data...');

  const { SPECIES_DATABASE } = await import('./species-data');
  const { EXTENDED_SPECIES_DATABASE } = await import('./extended-species-data');
  const { BATCH2_SPECIES_DATABASE } = await import('./batch-2-species-data');

  const allSpecies = [...SPECIES_DATABASE, ...EXTENDED_SPECIES_DATABASE, ...BATCH2_SPECIES_DATABASE];
  let feedingCount = 0;
  let habitatCount = 0;
  let behaviorCount = 0;
  let profileCount = 0;

  for (const species of allSpecies) {
    // Validate with proper speciesId check
    const feedingData: SpeciesFeedingData = {
      speciesId: species.speciesId,
      dietType: species.feeding!.dietType as string,
      recommendedFoods: (species.feeding!.recommendedFoods as Array<{ name: string; frequency: string; notes?: string }>),
      foodsToAvoid: species.feeding!.foodsToAvoid as Array<{ name: string; reason: string }>,
      mealFrequency: species.feeding!.mealFrequency as string,
      specificNeeds: species.feeding!.specificNeeds as string | undefined,
    };
    const habitatData: SpeciesHabitatData = {
      speciesId: species.speciesId,
      habitatType: species.habitat!.habitatType as string,
      tempMin: species.habitat!.tempMin,
      tempMax: species.habitat!.tempMax,
      humidityMin: species.habitat!.humidityMin,
      humidityMax: species.habitat!.humidityMax,
      minSpaceSize: species.habitat!.minSpaceSize as string,
      lightNeeds: species.habitat!.lightNeeds as string,
      activityEnrichment: species.habitat!.activityEnrichment as string,
      hygieneNotes: species.habitat!.hygieneNotes as string | undefined,
      costEstimate: species.habitat!.costEstimate as string,
    };
    const behaviorData: SpeciesBehaviorData = {
      speciesId: species.speciesId,
      generalBehavior: species.behavior!.generalBehavior as string,
      sociability: species.behavior!.sociability as string,
      difficultyLevel: species.behavior!.difficultyLevel as string,
      compatibilityWithChildren: species.behavior!.compatibilityWithChildren as string | undefined,
      compatibilityWithOtherAnimals: species.behavior!.compatibilityWithOtherAnimals as string | undefined,
    };

    if (!validateSpeciesProfile(species)) continue;
    if (!validateSpeciesFeeding(feedingData)) continue;
    if (!validateSpeciesHabitat(habitatData)) continue;
    if (!validateSpeciesBehavior(behaviorData)) continue;

    // Create SpeciesProfile
    try {
      await (prisma as any).speciesProfile.upsert({
        where: { speciesId: species.speciesId },
        update: {
          commonNameFr: species.commonNameFr,
          scientificName: species.scientificName,
          category: species.category,
          subcategory: species.subcategory,
          domesticationType: species.domesticationType,
          description: species.description,
        },
        create: {
          speciesId: species.speciesId,
          commonNameFr: species.commonNameFr,
          scientificName: species.scientificName,
          category: species.category,
          subcategory: species.subcategory,
          domesticationType: species.domesticationType,
          description: species.description,
        },
      });
      profileCount++;

      // Create SpeciesFeeding
      await (prisma as any).speciesFeeding.upsert({
        where: {
          speciesId_locale: {
            speciesId: species.speciesId,
            locale: 'fr',
          },
        },
        update: {
          dietType: feedingData.dietType,
          recommendedFoods: feedingData.recommendedFoods,
          foodsToAvoid: feedingData.foodsToAvoid,
          mealFrequency: feedingData.mealFrequency,
          specificNeeds: feedingData.specificNeeds,
        },
        create: {
          speciesId: species.speciesId,
          locale: 'fr',
          dietType: feedingData.dietType,
          recommendedFoods: feedingData.recommendedFoods,
          foodsToAvoid: feedingData.foodsToAvoid,
          mealFrequency: feedingData.mealFrequency,
          specificNeeds: feedingData.specificNeeds,
        },
      });
      feedingCount++;

      // Create SpeciesHabitat
      await (prisma as any).speciesHabitat.upsert({
        where: {
          speciesId_locale: {
            speciesId: species.speciesId,
            locale: 'fr',
          },
        },
        update: habitatData,
        create: {
          speciesId: species.speciesId,
          locale: 'fr',
          habitatType: habitatData.habitatType,
          tempMin: habitatData.tempMin,
          tempMax: habitatData.tempMax,
          humidityMin: habitatData.humidityMin,
          humidityMax: habitatData.humidityMax,
          minSpaceSize: habitatData.minSpaceSize,
          lightNeeds: habitatData.lightNeeds,
          activityEnrichment: habitatData.activityEnrichment,
          hygieneNotes: habitatData.hygieneNotes,
          costEstimate: habitatData.costEstimate,
        },
      });
      habitatCount++;

      // Create SpeciesBehavior
      await (prisma as any).speciesBehavior.upsert({
        where: {
          speciesId_locale: {
            speciesId: species.speciesId,
            locale: 'fr',
          },
        },
        update: behaviorData,
        create: {
          speciesId: species.speciesId,
          locale: 'fr',
          generalBehavior: behaviorData.generalBehavior,
          sociability: behaviorData.sociability,
          difficultyLevel: behaviorData.difficultyLevel,
          compatibilityWithChildren: behaviorData.compatibilityWithChildren,
          compatibilityWithOtherAnimals: behaviorData.compatibilityWithOtherAnimals,
        },
      });
      behaviorCount++;

      // SpeciesHealthContent (from species.health in file)
      const health = (species as { health?: { locale: string; diseases: unknown[]; sources: unknown[] } }).health;
      if (health) {
        await (prisma as any).speciesHealthContent.upsert({
          where: {
            speciesId_locale: { speciesId: species.speciesId, locale: health.locale || 'fr' },
          },
          update: { diseases: health.diseases, sources: health.sources },
          create: {
            speciesId: species.speciesId,
            locale: health.locale || 'fr',
            diseases: health.diseases,
            sources: health.sources,
          },
        });
      }

      // SpeciesLegislation (from species.legislation in file)
      const legislationList = (species as { legislation?: Array<{ country: string; status: string; details: object; sources: string[] }> }).legislation;
      if (legislationList && Array.isArray(legislationList)) {
        for (const leg of legislationList) {
          await (prisma as any).speciesLegislation.upsert({
            where: {
              speciesId_country: { speciesId: species.speciesId, country: leg.country },
            },
            update: { status: leg.status, details: leg.details, sources: leg.sources },
            create: {
              speciesId: species.speciesId,
              country: leg.country,
              status: leg.status,
              details: leg.details,
              sources: leg.sources,
            },
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error seeding species ${species.speciesId} (${species.commonNameFr}):`, error);
    }
  }

  console.log(`✅ Seeded ${profileCount} species profiles`);
  console.log(`✅ Seeded ${feedingCount} feeding records`);
  console.log(`✅ Seeded ${habitatCount} habitat records`);
  console.log(`✅ Seeded ${behaviorCount} behavior records`);

  // Import existing seed functions
  // ============================================
  // 1. RecommendedEquipment (Prioritaire)
  // ============================================
  console.log('📦 Seeding RecommendedEquipment...');

  // General recommendations (speciesId: null)
  const generalEquipment = [
    {
      speciesId: null,
      category: 'thermostat',
      label: 'Thermostat digital',
      size: null,
      searchTerms: ['thermostat reptile', 'thermostat terrarium digital'],
      order: 0,
    },
    {
      speciesId: null,
      category: 'thermometre',
      label: 'Thermomètre hygromètre digital',
      size: null,
      searchTerms: ['thermomètre reptile', 'hygromètre terrarium'],
      order: 1,
    },
    {
      speciesId: null,
      category: 'pulverisateur',
      label: 'Pulvérisateur brumisateur',
      size: null,
      searchTerms: ['pulvérisateur terrarium', 'brumisateur reptile'],
      order: 2,
    },
    {
      speciesId: null,
      category: 'pince',
      label: 'Pince de nourrissage inox',
      size: null,
      searchTerms: ['pince nourrissage reptile', 'pince terrarium'],
      order: 3,
    },
    {
      speciesId: null,
      category: 'desinfectant',
      label: 'Désinfectant terrarium',
      size: null,
      searchTerms: ['désinfectant terrarium', 'nettoyant reptile'],
      order: 4,
    },
  ];

  // Boa constrictor equipment
  const boaEquipment = [
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'cage',
      label: 'Terrarium 150x60x60cm',
      size: 'large',
      searchTerms: ['terrarium boa', 'terrarium 150cm', 'terrarium grand serpent'],
      order: 0,
    },
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'chauffage',
      label: 'Tapis chauffant 45W',
      size: 'large',
      searchTerms: ['tapis chauffant reptile', 'tapis chauffant terrarium 45w'],
      order: 1,
    },
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'chauffage',
      label: 'Lampe céramique 100W',
      size: 'large',
      searchTerms: ['lampe céramique reptile', 'chauffage céramique 100w'],
      order: 2,
    },
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'substrat',
      label: 'Copeaux de coco',
      size: null,
      searchTerms: ['substrat coco reptile', 'copeaux coco terrarium'],
      order: 3,
    },
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'cachette',
      label: 'Cachette grande taille',
      size: 'large',
      searchTerms: ['cachette serpent', 'cachette terrarium grande'],
      order: 4,
    },
    {
      speciesId: SPECIES_IDS.BOA_CONSTRICTOR,
      category: 'gamelle',
      label: 'Gamelle eau grand format',
      size: 'large',
      searchTerms: ['gamelle serpent', 'gamelle eau terrarium grande'],
      order: 5,
    },
  ];

  // Gecko leopard equipment
  const geckoEquipment = [
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'cage',
      label: 'Terrarium 60x45x30cm',
      size: 'medium',
      searchTerms: ['terrarium gecko', 'terrarium 60cm', 'terrarium gecko leopard'],
      order: 0,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'chauffage',
      label: 'Tapis chauffant 14W',
      size: 'small',
      searchTerms: ['tapis chauffant gecko', 'tapis chauffant 14w'],
      order: 1,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'substrat',
      label: 'Sable excavator ou papier absorbant',
      size: null,
      searchTerms: ['substrat gecko leopard', 'sable excavator'],
      order: 2,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'cachette',
      label: 'Cachette humide (mue)',
      size: 'small',
      searchTerms: ['cachette humide gecko', 'boîte mue reptile'],
      order: 3,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'cachette',
      label: 'Cachette sèche zone froide',
      size: 'small',
      searchTerms: ['cachette gecko', 'cachette terrarium petite'],
      order: 4,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'gamelle',
      label: 'Gamelle eau petite',
      size: 'small',
      searchTerms: ['gamelle gecko', 'gamelle eau petite reptile'],
      order: 5,
    },
    {
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      category: 'alimentation',
      label: 'Calcium + D3',
      size: null,
      searchTerms: ['calcium gecko', 'supplément calcium reptile D3'],
      order: 6,
    },
  ];

  // Iguana equipment
  const iguanaEquipment = [
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'cage',
      label: 'Terrarium 200x100x150cm',
      size: 'large',
      searchTerms: ['terrarium iguane', 'terrarium grand arboricole'],
      order: 0,
    },
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'uvb',
      label: 'Lampe UVB 10.0 T5',
      size: 'large',
      searchTerms: ['lampe uvb 10.0', 'tube uvb reptile T5'],
      order: 1,
    },
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'chauffage',
      label: 'Spot chauffant 150W',
      size: 'large',
      searchTerms: ['spot chauffant reptile', 'lampe chauffante 150w'],
      order: 2,
    },
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'substrat',
      label: 'Écorces de coco',
      size: null,
      searchTerms: ['substrat écorce coco', 'substrat iguane'],
      order: 3,
    },
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'branche',
      label: 'Branches grimpoir',
      size: 'large',
      searchTerms: ['branches terrarium', 'grimpoir reptile'],
      order: 4,
    },
    {
      speciesId: SPECIES_IDS.IGUANA_IGUANA,
      category: 'gamelle',
      label: 'Gamelle eau grande',
      size: 'large',
      searchTerms: ['gamelle iguane', 'gamelle eau grande reptile'],
      order: 5,
    },
  ];

  // Tortue equipment
  const tortueEquipment = [
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'cage',
      label: 'Aquaterrarium 120x60x60cm',
      size: 'large',
      searchTerms: ['aquaterrarium tortue', 'bassin tortue aquatique'],
      order: 0,
    },
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'filtration',
      label: 'Filtre externe 1200 l/h',
      size: 'large',
      searchTerms: ['filtre tortue', 'filtre aquaterrarium'],
      order: 1,
    },
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'chauffage',
      label: 'Chauffage 300W submersible',
      size: 'large',
      searchTerms: ['chauffage aquaterrarium', 'thermostat aquatique'],
      order: 2,
    },
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'uvb',
      label: 'Lampe UVB 10.0 T8',
      size: 'large',
      searchTerms: ['lampe uvb tortue', 'tube uvb aquatique'],
      order: 3,
    },
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'substrat',
      label: 'Sable pour fond aquatique',
      size: null,
      searchTerms: ['sable tortue', 'substrat aquatique'],
      order: 4,
    },
    {
      speciesId: SPECIES_IDS.TORTUE,
      category: 'cachette',
      label: 'Roche ou plateforme flottante',
      size: 'large',
      searchTerms: ['plateforme tortue', 'roche aquaterrarium'],
      order: 5,
    },
  ];

  // Python royal equipment
  const pythonRoyalEquipment = [
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'cage',
      label: 'Terrarium 120x60x60cm',
      size: 'medium',
      searchTerms: ['terrarium python royal', 'terrarium serpent moyen'],
      order: 0,
    },
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'chauffage',
      label: 'Tapis chauffant 45W avec thermostat',
      size: 'medium',
      searchTerms: ['tapis chauffant python', 'thermostat serpent'],
      order: 1,
    },
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'cachette',
      label: 'Cachette tempérée',
      size: 'medium',
      searchTerms: ['cachette python', 'cachette terrarium moyen'],
      order: 2,
    },
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'substrat',
      label: 'Copeaux de coco ou aspen',
      size: null,
      searchTerms: ['substrat python', 'copeaux terrarium'],
      order: 3,
    },
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'gamelle',
      label: 'Gamelle eau terrarium',
      size: 'medium',
      searchTerms: ['gamelle serpent', 'gamelle terrarium'],
      order: 4,
    },
    {
      speciesId: SPECIES_IDS.PYTHON_ROYAL,
      category: 'pince',
      label: 'Pince de nourrissage',
      size: null,
      searchTerms: ['pince python', 'pince nourrissage'],
      order: 5,
    },
  ];

  const allEquipment = [
    ...generalEquipment,
    ...boaEquipment,
    ...geckoEquipment,
    ...iguanaEquipment,
    ...tortueEquipment,
    ...pythonRoyalEquipment,
  ];

  for (const eq of allEquipment) {
    await prisma.recommendedEquipment.upsert({
      where: {
        id: `${eq.speciesId || 'general'}-${eq.category}-${eq.order}`,
      },
      update: eq,
      create: {
        id: `${eq.speciesId || 'general'}-${eq.category}-${eq.order}`,
        ...eq,
      },
    });
  }

  console.log(`✅ Created ${allEquipment.length} equipment recommendations`);

  // ============================================
  // 4. User + Animal + NotificationPreference (Test data)
  // ============================================
  console.log('👤 Seeding test User, Animal, NotificationPreference...');

  const passwordHash = await bcrypt.hash('Test1234!', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@captivia.local' },
    update: { isPremium: true },
    create: {
      email: 'test@captivia.local',
      passwordHash,
      locale: 'fr',
      isPremium: true,
    },
  });

  console.log(`✅ Created test user: ${testUser.email}`);

  // Create a test animal
  const testAnimal = await prisma.animal.upsert({
    where: { id: 'test-animal-rango' },
    update: {},
    create: {
      id: 'test-animal-rango',
      userId: testUser.id,
      speciesId: SPECIES_IDS.GECKO_LEOPARD,
      name: 'Rango',
      birthDate: new Date('2023-06-15'),
      sex: 'male',
      notes: 'Gecko léopard très docile, mange bien',
    },
  });

  console.log(`✅ Created test animal: ${testAnimal.name}`);

  // Create notification preferences
  await prisma.notificationPreference.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      types: {
        nourrissage: true,
        nettoyage: true,
        uvb: true,
        sante: true,
      },
      schedule: {
        start: '08:00',
        end: '22:00',
      },
      snooze: 15,
    },
  });

  console.log('✅ Created notification preferences');

  // Create a sample routine
  await prisma.routine.upsert({
    where: { id: 'test-routine-feeding' },
    update: {},
    create: {
      id: 'test-routine-feeding',
      animalId: testAnimal.id,
      type: 'nourrissage',
      frequency: 'weekly',
      schedule: {
        days: ['tuesday', 'friday'],
        time: '19:00',
      },
      active: true,
    },
  });

  console.log('✅ Created sample routine');

  // ============================================
  // Magasins / liens d'affiliation (NAC FR/BE)
  // Compléter les URL avec vos vrais liens d'affiliation depuis Affiliation_animaux_NAC_FR_BE.docx
  // ============================================
  await prisma.affiliateStore.deleteMany({});
  const affiliateStores = [
    {
      name: 'Croquettes & alimentation chien',
      url: 'https://www.example-pet-shop.fr/chiens/croquettes',
      description: 'Croquettes, pâtées et accessoires alimentation pour chien',
      categories: ['mammifère'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
    {
      name: 'Matériel et accessoires chien',
      url: 'https://www.example-pet-shop.fr/chiens/materiel',
      description: 'Gamelles, laisses, couchage, jouets pour chien',
      categories: ['mammifère'],
      types: ['materiel'],
      order: 1,
    },
    {
      name: 'Alimentation & matériel reptile',
      url: 'https://www.example-reptile-shop.fr/',
      description: 'Nourriture, terrariums, chauffage et UV pour reptiles',
      categories: ['reptile'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
    {
      name: 'Terrariophilie – NAC reptiles',
      url: 'https://www.example-nac.fr/reptiles',
      description: 'Terrariums, substrats, lampes UV et alimentation reptile',
      categories: ['reptile'],
      types: ['alimentation', 'materiel', 'general'],
      order: 1,
    },
    {
      name: 'Alimentation & cages oiseaux',
      url: 'https://www.example-bird-shop.fr/',
      description: 'Graines, cages, perchoirs et accessoires pour oiseaux',
      categories: ['oiseau'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
    {
      name: 'Aquariophilie – poissons',
      url: 'https://www.example-aquarium.fr/',
      description: 'Nourriture, aquariums, filtres et accessoires pour poissons',
      categories: ['poisson'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
    {
      name: 'NAC – rongeurs & petits mammifères',
      url: 'https://www.example-nac.fr/rongeurs',
      description: 'Alimentation et matériel pour lapin, cochon d\'Inde, hamster',
      categories: ['mammifère'],
      types: ['alimentation', 'materiel'],
      order: 2,
    },
    {
      name: 'Amphibiens & matériel',
      url: 'https://www.example-nac.fr/amphibiens',
      description: 'Terrariums, nourriture et accessoires pour amphibiens',
      categories: ['amphibien'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
    {
      name: 'Insectes & invertébrés',
      url: 'https://www.example-nac.fr/insectes',
      description: 'Nourriture et petits terrariums pour insectes et invertébrés',
      categories: ['insecte', 'arachnide'],
      types: ['alimentation', 'materiel'],
      order: 0,
    },
  ];
  await prisma.affiliateStore.createMany({ data: affiliateStores });
  console.log('✅ Created affiliate stores (magasins)');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test credentials:');
  console.log('   Email: test@captivia.local');
  console.log('   Password: Test1234!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
