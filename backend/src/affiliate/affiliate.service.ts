import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les magasins / liens d'affiliation.
   * Filtre par catégorie d'espèce (mammifère, reptile, oiseau, etc.) pour n'afficher
   * que les magasins adaptés (ex. pas de magasin reptile pour une fiche mammifère).
   */
  async getStores(category?: string, type?: string) {
    const where: { categories?: { has: string }; types?: { has: string } } = {};
    if (category && category.trim()) {
      where.categories = { has: category.trim().toLowerCase() };
    }
    if (type && type.trim()) {
      where.types = { has: type.trim().toLowerCase() };
    }
    return this.prisma.affiliateStore.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }
}
