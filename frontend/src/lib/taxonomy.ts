/**
 * Mapping of GBIF taxonomy values to human-readable common names.
 * Used across the application for displaying animal types in a user-friendly way.
 */

export const taxonomyMap = {
  // Class mappings
  'Reptilia': 'Reptile',
  'Aves': 'Oiseau',
  'Mammalia': 'Mammifère',
  'Amphibia': 'Amphibien',
  'Actinopterygii': 'Poisson',
  'Insecta': 'Insecte',
  'Arachnida': 'Arachnide',
  'Gastropoda': 'Gastéropode',
  'Bivalvia': 'Bivalve',
  'Cephalopoda': 'Céphalopode',
  'Crustacea': 'Crustacé',
  
  // Kingdom mappings
  'Animalia': 'Animal',
  'Plantae': 'Plante',
  'Fungi': 'Champignon',
  'Bacteria': 'Bactérie',
  'Archaea': 'Archée',
} as const;

/**
 * Convert a GBIF taxonomy value to a human-readable common name.
 * Falls back to the original value if no mapping exists.
 */
export function getTaxonomyLabel(value?: string): string {
  if (!value) return '-';
  return taxonomyMap[value as keyof typeof taxonomyMap] || value;
}

/**
 * Get all available animal class filters for quick search.
 * Returns array of {label, gbifValue} for UI display.
 */
export const animalTypeFilters = [
  { label: 'Reptile', gbifValue: 'Reptilia' },
  { label: 'Oiseau', gbifValue: 'Aves' },
  { label: 'Mammifère', gbifValue: 'Mammalia' },
  { label: 'Amphibien', gbifValue: 'Amphibia' },
  { label: 'Poisson', gbifValue: 'Actinopterygii' },
  { label: 'Insecte', gbifValue: 'Insecta' },
  { label: 'Arachnide', gbifValue: 'Arachnida' },
  { label: 'Crustacé', gbifValue: 'Crustacea' },
] as const;
