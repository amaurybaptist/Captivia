import { CATEGORIES, QUESTIONS_PER_CATEGORY, TOTAL_QUESTIONS, loadQuestions } from '../catalog';

describe('Banques éditoriales', () => {
  it('contient au moins 200 questions complètes par thème et 1 200 au total', async () => {
    const ids = new Set<string>();
    const prompts = new Set<string>();
    for (const category of CATEGORIES) {
      const bank = await loadQuestions(category.id);
      expect(bank.length).toBeGreaterThanOrEqual(QUESTIONS_PER_CATEGORY);
      for (const question of bank) {
        expect(question.category).toBe(category.id);
        expect(ids.has(question.id)).toBe(false);
        ids.add(question.id);
        const normalized = question.prompt.toLocaleLowerCase('fr').replace(/[\s’']/g, '');
        expect(prompts.has(normalized)).toBe(false);
        prompts.add(normalized);
        for (const text of [
          question.animal,
          question.prompt,
          question.explanation,
          question.didYouKnow,
        ]) {
          expect(typeof text).toBe('string');
          expect(text.trim().length).toBeGreaterThan(2);
          expect(text).not.toMatch(/TODO|à compléter|lorem ipsum/i);
        }
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((s) => s.trim().toLocaleLowerCase('fr'))).size).toBe(4);
        expect(question.options.every((option) => option.trim().length > 0)).toBe(true);
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
        expect(question.didYouKnow).not.toBe(question.explanation);
      }
    }
    expect(ids.size).toBeGreaterThanOrEqual(TOTAL_QUESTIONS);
  });
  it('le mode aléatoire charge les six banques', async () => {
    const all = await loadQuestions('all');
    expect(all.length).toBeGreaterThanOrEqual(1200);
    expect(new Set(all.map((q) => q.category)).size).toBe(6);
  });

  it('chaque question possède une image locale créditée dans le catalogue livré', async () => {
    const all = await loadQuestions('all');
    expect(all.filter((q) => !q.image).map((q) => q.id)).toEqual([]);
    for (const question of all) {
      const photo = question.image!;
      expect(photo.src).toMatch(/^\/quiz\/images\//);
      expect(photo.caption.trim()).not.toBe('');
      expect(photo.creator.trim()).not.toBe('');
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.sourcePage).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(photo.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });
});
