/**
 * Import des bases de données animaux FR/BE (fichiers TXT) dans SpeciesProfile
 * pour que les espèces soient trouvables par la recherche du site.
 *
 * Fichiers attendus (dans le répertoire ANIMAL_DB_DIR) :
 * - BD_animaux_MAMMIFERES_FR_BE.txt
 * - BD_animaux_OISEAUX_FR_BE.txt
 * - BD_animaux_POISSONS_FR_BE.txt
 * - BD_animaux_REPTILES_AMPHIBIENS_FR_BE.txt
 * - BD_animaux_ARACHNIDES_FR_BE.txt
 * - BD_animaux_INSECTES_INVERT_FR_BE.txt
 * - BD_animaux_AUTRES_INVERT_FR_BE.txt
 * - base_donnees_animaux_adoptables_FR_BE_v1.txt (optionnel, format différent)
 *
 * Usage: ANIMAL_DB_DIR=/chemin/vers/dossier npx ts-node prisma/import-fr-be-databases.ts
 * Par défaut: /Users/amaurybaptist/Desktop/OnBrain
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

function findDbDir(): string {
  if (process.env.ANIMAL_DB_DIR) return process.env.ANIMAL_DB_DIR;
  // Search up from __dirname for a sibling directory starting with "base de donn"
  let searchDir = path.resolve(__dirname, '..', '..');
  for (let i = 0; i < 4; i++) {
    const entries = fs.readdirSync(searchDir);
    const dbFolder = entries.find((e) => {
      const fullPath = path.join(searchDir, e);
      return e.startsWith('base de donn') && fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    });
    if (dbFolder) return path.join(searchDir, dbFolder);
    searchDir = path.resolve(searchDir, '..');
  }
  return path.resolve(__dirname, '..', '..');
}

const ANIMAL_DB_DIR = findDbDir();

const FILES_AND_CATEGORY: { file: string; category: string; format?: 'v1' | 'v3' }[] = [
  { file: 'BD_animaux_MAMMIFERES_FR_BE.txt', category: 'mammifère' },
  { file: 'BD_animaux_OISEAUX_FR_BE.txt', category: 'oiseau' },
  { file: 'BD_animaux_POISSONS_FR_BE.txt', category: 'poisson' },
  { file: 'BD_animaux_REPTILES_AMPHIBIENS_FR_BE.txt', category: 'reptile' },
  { file: 'BD_animaux_ARACHNIDES_FR_BE.txt', category: 'arachnide' },
  { file: 'BD_animaux_INSECTES_INVERT_FR_BE.txt', category: 'insecte' },
  { file: 'BD_animaux_AUTRES_INVERT_FR_BE.txt', category: 'insecte' },
  // V3 files
  { file: 'BD_V3_BELGIQUE_MAMMIFERES_WALLONIE.txt', category: 'mammifère', format: 'v3' },
  { file: 'BD_V3_BELGIQUE_REPTILES_WALLONIE.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_AMPHIBIENS_LOT1.txt', category: 'amphibien', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_LEZARDS_LOT1.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_LEZARDS_LOT2.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_LEZARDS_LOT3.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_SERPENTS_LOT1.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_SERPENTS_LOT2.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_SERPENTS_LOT3.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_TORTUES_LOT1.txt', category: 'reptile', format: 'v3' },
  { file: 'BD_V3_BXL_REPTILES_TORTUES_LOT2.txt', category: 'reptile', format: 'v3' },
];

interface ParsedSpecies {
  nom: string;
  scientifique: string;
  taille?: string;
  terrariumEnclos?: string;
  temperature?: string;
  uv?: string;
  nourriture?: string;
  legalite?: string;
  maladiesFrequentes?: string;
  signes?: string;
  difficulte?: string;
  hygrometrie?: string;
}

function parseBlockV1(block: string): ParsedSpecies | null {
  const lines = block.trim().split('\n');
  let nom = '';
  let scientifique = '';
  let taille = '';
  let terrariumEnclos = '';
  let temperature = '';
  let uv = '';
  let nourriture = '';
  let legalite = '';
  let maladiesFrequentes = '';
  let signes = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Nom :')) nom = trimmed.replace(/^Nom\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Scientifique :')) scientifique = trimmed.replace(/^Scientifique\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Taille :')) taille = trimmed.replace(/^Taille\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Terrarium/Enclos :')) terrariumEnclos = trimmed.replace(/^Terrarium\/Enclos\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('T° :')) temperature = trimmed.replace(/^T°\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('UV :')) uv = trimmed.replace(/^UV\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Nourriture :')) nourriture = trimmed.replace(/^Nourriture\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Légalité FR/BE :')) legalite = trimmed.replace(/^Légalité FR\/BE\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Maladies fréquentes :')) maladiesFrequentes = trimmed.replace(/^Maladies fréquentes\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Signes à reconnaître :')) signes = trimmed.replace(/^Signes à reconnaître\s*:\s*/i, '').trim();
  }

  if (!nom || !scientifique) return null;
  return {
    nom,
    scientifique,
    taille: taille || undefined,
    terrariumEnclos: terrariumEnclos || undefined,
    temperature: temperature || undefined,
    uv: uv || undefined,
    nourriture: nourriture || undefined,
    legalite: legalite || undefined,
    maladiesFrequentes: maladiesFrequentes || undefined,
    signes: signes || undefined,
  };
}

function parseBlockV3(block: string): ParsedSpecies | null {
  const lines = block.trim().split('\n');
  let nom = '';
  let scientifique = '';
  let taille = '';
  let terrariumEnclos = '';
  let temperature = '';
  let uv = '';
  let nourriture = '';
  let legalite = '';
  let maladiesFrequentes = '';
  let signes = '';
  let difficulte = '';
  let hygrometrie = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Nom :')) nom = trimmed.replace(/^Nom\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Nom scientifique :')) scientifique = trimmed.replace(/^Nom scientifique\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Taille adulte :')) taille = trimmed.replace(/^Taille adulte\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Habitat / installation :') || trimmed.startsWith('Habitat/installation :'))
      terrariumEnclos = trimmed.replace(/^Habitat\s*\/\s*installation\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Température :') || trimmed.startsWith('Temperature :'))
      temperature = trimmed.replace(/^Temp[ée]rature\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Hygrométrie :') || trimmed.startsWith('Hygrometrie :'))
      hygrometrie = trimmed.replace(/^Hygrom[ée]trie\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('UV :')) uv = trimmed.replace(/^UV\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Alimentation :')) nourriture = trimmed.replace(/^Alimentation\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Légalité Belgique :') || trimmed.startsWith('Légalité France :')) {
      const val = trimmed.replace(/^Légalité\s+(Belgique|France)\s*:\s*/i, '').trim();
      legalite = legalite ? `${legalite} | ${val}` : val;
    }
    else if (trimmed.startsWith('Difficulté :')) difficulte = trimmed.replace(/^Difficulté\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Maladies fréquentes :')) maladiesFrequentes = trimmed.replace(/^Maladies fréquentes\s*:\s*/i, '').trim();
    else if (trimmed.startsWith('Parasites courants :')) {
      const parasites = trimmed.replace(/^Parasites courants\s*:\s*/i, '').trim();
      maladiesFrequentes = maladiesFrequentes ? `${maladiesFrequentes}; ${parasites}` : parasites;
    }
    else if (trimmed.startsWith('Signes cliniques :')) signes = trimmed.replace(/^Signes cliniques\s*:\s*/i, '').trim();
  }

  if (!nom || !scientifique) return null;
  return {
    nom,
    scientifique,
    taille: taille || undefined,
    terrariumEnclos: terrariumEnclos || undefined,
    temperature: temperature || undefined,
    uv: uv || undefined,
    nourriture: nourriture || undefined,
    legalite: legalite || undefined,
    maladiesFrequentes: maladiesFrequentes || undefined,
    signes: signes || undefined,
    difficulte: difficulte || undefined,
    hygrometrie: hygrometrie || undefined,
  };
}

function parseFile(content: string, format: 'v1' | 'v3' = 'v1'): ParsedSpecies[] {
  const species: ParsedSpecies[] = [];
  const blockRegex = /---\s*\d+\.\s+.+?---\s*\n([\s\S]*?)(?=---\s*\d+\.|$)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(content)) !== null) {
    const block = m[1];
    const parsed = format === 'v3' ? parseBlockV3(block) : parseBlockV1(block);
    if (parsed) species.push(parsed);
  }
  return species;
}

async function getGbifKey(scientificName: string): Promise<number | null> {
  try {
    const res = await axios.get('https://api.gbif.org/v1/species/match', {
      params: { name: scientificName },
      timeout: 10000,
    });
    const key = res.data?.usageKey ?? res.data?.speciesKey ?? res.data?.key;
    if (key && typeof key === 'number') return key;
    return null;
  } catch {
    return null;
  }
}

function buildDescription(p: ParsedSpecies): string {
  const parts: string[] = [];
  if (p.nourriture) parts.push(`Alimentation : ${p.nourriture.slice(0, 150)}`);
  if (p.terrariumEnclos) parts.push(`Logement : ${p.terrariumEnclos.slice(0, 120)}`);
  if (p.temperature) parts.push(`Température : ${p.temperature}`);
  if (p.legalite) parts.push(`Légalité FR/BE : ${p.legalite.slice(0, 120)}`);
  return parts.join('. ') || `${p.nom} — ${p.scientifique}`;
}

function buildDiseasesFromParsed(p: ParsedSpecies): { name: string; symptoms: string; prevention: string; whenToConsult: string }[] {
  const diseases: { name: string; symptoms: string; prevention: string; whenToConsult: string }[] = [];
  if (p.maladiesFrequentes) {
    const names = p.maladiesFrequentes.split(/\s*;\s*/).filter((s) => s.length > 0);
    const signes = p.signes || '';
    for (const name of names.slice(0, 5)) {
      diseases.push({
        name: name.slice(0, 120),
        symptoms: signes.slice(0, 300),
        prevention: 'Consulter un vétérinaire et respecter les soins recommandés pour l\'espèce.',
        whenToConsult: 'En cas de signes anormaux (abattement, refus de s\'alimenter, respiration difficile, diarrhée persistante).',
      });
    }
  }
  return diseases;
}

async function main() {
  console.log('📂 Répertoire des fichiers:', ANIMAL_DB_DIR);
  const allParsed: { category: string; species: ParsedSpecies[] }[] = [];

  for (const { file, category, format } of FILES_AND_CATEGORY) {
    const filePath = path.join(ANIMAL_DB_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️ Fichier non trouvé:', filePath);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const species = parseFile(content, format || 'v1');
    console.log(`   ${file}: ${species.length} espèces (${category})`);
    allParsed.push({ category, species });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Espèces en doublon (synonymes) : une seule entrée canonique par espèce (celle du seed, la plus complète)
  const CANONICAL_SPECIES: Record<
    number,
    { scientificNames: string[]; commonNames: string[] }
  > = {
    5287871: {
      scientificNames: ['Canis familiaris', 'Canis lupus familiaris'],
      commonNames: ['Chien', 'Chien domestique'],
    },
    5281802: {
      scientificNames: ['Felis catus'],
      commonNames: ['Chat', 'Chat domestique'],
    },
    5283399: {
      scientificNames: ['Oryctolagus cuniculus'],
      commonNames: ['Lapin', 'Lapin domestique'],
    },
    5281775: {
      scientificNames: ['Cavia porcellus'],
      commonNames: ['Cochon d\'Inde', 'Cabaye'],
    },
  };
  const CANONICAL_IDS = new Set(Object.keys(CANONICAL_SPECIES).map(Number));
  const MIN_DESCRIPTION_LENGTH_PRESERVE = 200;

  for (const { category, species } of allParsed) {
    for (const p of species) {
      let gbifKey = await getGbifKey(p.scientifique);
      if (gbifKey == null) {
        console.warn('   ⚠️ GBIF key non trouvée:', p.scientifique);
        skipped++;
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const nom = p.nom.trim();
      const scientifique = p.scientifique.trim();
      for (const [canonIdStr, { scientificNames, commonNames }] of Object.entries(CANONICAL_SPECIES)) {
        const canonId = Number(canonIdStr);
        if (
          scientificNames.includes(scientifique) ||
          (category === 'mammifère' && commonNames.some((n) => n === nom || nom.includes(n)))
        ) {
          gbifKey = canonId;
          break;
        }
      }

      const description = buildDescription(p);
      const domesticationType = category === 'mammifère' && ['Chien', 'Chat'].some((n) => p.nom.includes(n)) ? 'domestique' : 'NAC';

      try {
        const existing = await prisma.speciesProfile.findUnique({ where: { speciesId: gbifKey } });
        const updatePayload: Record<string, unknown> = {
          commonNameFr: p.nom,
          scientificName: p.scientifique,
          category,
          domesticationType,
          description: description.slice(0, 500),
        };
        if (
          CANONICAL_IDS.has(gbifKey) &&
          existing?.description &&
          existing.description.length > MIN_DESCRIPTION_LENGTH_PRESERVE
        ) {
          delete updatePayload.description;
        }
        await prisma.speciesProfile.upsert({
          where: { speciesId: gbifKey },
          update: updatePayload,
          create: {
            speciesId: gbifKey,
            commonNameFr: p.nom,
            scientificName: p.scientifique,
            category,
            domesticationType,
            description: description.slice(0, 500),
          },
        });
        if (existing) updated++;
        else created++;

        const diseases = buildDiseasesFromParsed(p);
        if (diseases.length > 0) {
          await prisma.speciesHealthContent.upsert({
            where: { speciesId_locale: { speciesId: gbifKey, locale: 'fr' } },
            update: { diseases: diseases as object, sources: [] },
            create: {
              speciesId: gbifKey,
              locale: 'fr',
              diseases: diseases as object,
              sources: [],
            },
          });
        }
      } catch (e) {
        console.error('   ❌', p.nom, p.scientifique, e);
        skipped++;
      }

      await new Promise((r) => setTimeout(r, 350));
    }
  }

  console.log('\n✅ Import terminé.');
  console.log('   Créés:', created, '| Mis à jour:', updated, '| Ignorés:', skipped);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
