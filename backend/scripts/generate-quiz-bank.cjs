const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const categories = [
  'birds',
  'reptiles',
  'insects',
  'fish',
  'mammals',
  'unusual',
];
const rows = [];
for (const category of categories) {
  const file = path.join(
    root,
    'frontend/src/lib/quiz/data',
    `${category}.json`,
  );
  const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const question of bank) {
    if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
      throw new Error(`${category}/${question.id} has no valid difficulty`);
    }
    if (
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer > 3
    ) {
      throw new Error(`${category}/${question.id} has invalid answer`);
    }
    rows.push({
      id: question.id,
      category,
      difficulty: question.difficulty,
      answer: question.answer,
    });
  }
}
const output = path.join(__dirname, '../src/quiz/data/questions.json');
fs.writeFileSync(output, `${JSON.stringify(rows)}\n`);
console.log(
  `Generated ${rows.length} compact quiz answers at ${path.relative(root, output)}`,
);
