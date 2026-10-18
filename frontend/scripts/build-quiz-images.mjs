// Compile compact per-category image catalogs from the reviewed Commons manifest.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quiz = path.join(root, 'src/lib/quiz');
const manifest = JSON.parse(await fs.readFile(path.join(quiz, 'image-assets.json'), 'utf8'));
const partial = process.argv.includes('--allow-missing');
const missing = [];
const catalogs = {};
const used = new Set();
const checked = new Set();
const hashes = new Set();
const filename = (value) => value.normalize('NFC').replace(/^File:/i, '').replaceAll('_', ' ').replace(/\s+/g, ' ').trim().toLowerCase();
for (const category of ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual']) {
  const bank = JSON.parse(await fs.readFile(path.join(quiz, `data/${category}.json`), 'utf8'));
  const subjects = JSON.parse(
    await fs.readFile(path.join(quiz, `data/${category}-image-subjects.json`), 'utf8'),
  );
  assert.equal(bank.length, 200);
  assert.equal(Object.keys(subjects).length, bank.length);
  const catalog = {};
  for (const question of bank) {
    const subject = subjects[question.id];
    assert.ok(subject?.query && subject.caption, question.id);
    const image = manifest[subject.query];
    if (!image) {
      missing.push({ id: question.id, query: subject.query });
      continue;
    }
    assert.match(image.src, /^\/quiz\/images\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/);
    assert.match(image.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(image.licenseName, /^CC0(?: 1\.0)?$|^CC BY(?:-SA)? [0-9.]+$|^Public domain$/i);
    assert.match(image.licenseUrl, /^https:\/\/creativecommons\.org\//);
    assert.ok(image.creator?.trim() && image.title?.trim());
    assert.ok(image.width > 0 && image.height > 0);
    if (image.sourceType === 'wikipedia-pageimage') {
      assert.ok(image.wikipediaFileTitle, `Missing filename identity evidence: ${subject.query}`);
      let expected = filename(image.wikipediaFileTitle);
      const redirects = new Map((image.commonsFileRedirects || []).map((row) => [filename(row.from), filename(row.to)]));
      const seen = new Set();
      while (redirects.has(expected) && !seen.has(expected)) { seen.add(expected); expected = redirects.get(expected); }
      assert.equal(filename(image.title), expected, `Wikipedia/Commons image mismatch: ${subject.query}`);
    }
    if (!checked.has(image.src)) {
      const bytes = await fs.readFile(path.join(root, 'public', image.src));
      assert.equal(
        crypto.createHash('sha256').update(bytes).digest('hex'),
        image.sha256,
        image.src,
      );
      checked.add(image.src);
    }
    catalog[question.id] = {
      src: image.src,
      width: image.width,
      height: image.height,
      title: image.title,
      creator: image.creator,
      licenseName: image.licenseName,
      licenseUrl: image.licenseUrl,
      sourcePage: image.sourcePage,
      caption:
        subject.caption + (image.kind === 'illustration' ? ' (Illustration scientifique.)' : ''),
    };
    used.add(image.src);
    hashes.add(image.sha256);
  }
  catalogs[category] = catalog;
}
await fs.writeFile(
  '/tmp/captivia-quiz-missing-images.json',
  JSON.stringify(missing, null, 2) + '\n',
);
if (missing.length && !partial)
  throw new Error(
    `${missing.length} questions sans image. Voir /tmp/captivia-quiz-missing-images.json ; aucun catalogue remplacé.`,
  );
await fs.mkdir(path.join(quiz, 'images'), { recursive: true });
for (const [category, catalog] of Object.entries(catalogs)) {
  await fs.writeFile(path.join(quiz, `images/${category}.json`), JSON.stringify(catalog) + '\n');
}
console.log(`${1200 - missing.length}/1200 questions illustrées, ${hashes.size} images distinctes (${used.size} fichiers), attributions/licences/identité/fichiers/SHA-256 vérifiés.${partial ? ' Catalogues provisoires.' : ''}`);
