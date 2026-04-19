// Dedup-aware importer: inserts only non-duplicate questions
// Dedup key = normalized questionText (first 200 chars, lowercased, whitespace collapsed)
// Usage: node scripts/import-new-questions.js <path-to-json>
const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .slice(0, 200);
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: node scripts/import-new-questions.js <path-to-json>');
    process.exit(1);
  }
  const absPath = path.isAbsolute(inputFile)
    ? inputFile
    : path.join(process.cwd(), inputFile);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const newQuestions = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  console.log(`Loaded ${newQuestions.length} questions from ${absPath}`);

  // Load existing questions' normalized text into a Set
  console.log('Fetching existing question fingerprints...');
  const existing = await prisma.question.findMany({ select: { questionText: true } });
  const existingKeys = new Set(existing.map(q => normalize(q.questionText)));
  console.log(`Existing in DB: ${existing.length}`);

  // Filter out duplicates
  const seenThisRun = new Set();
  const toInsert = [];
  let skippedDupExisting = 0;
  let skippedDupRun = 0;
  let skippedBad = 0;

  for (const q of newQuestions) {
    if (!q.questionText || !q.correctAnswer || !q.subject) { skippedBad++; continue; }
    const key = normalize(q.questionText);
    if (!key) { skippedBad++; continue; }
    if (existingKeys.has(key)) { skippedDupExisting++; continue; }
    if (seenThisRun.has(key)) { skippedDupRun++; continue; }
    seenThisRun.add(key);
    toInsert.push({
      subject: q.subject,
      topic: (q.topic || '').replace(/\0/g, ''),
      difficulty: q.difficulty || 3,
      questionType: q.questionType || 'TOSS_UP',
      answerFormat: q.answerFormat || 'MULTIPLE_CHOICE',
      questionText: q.questionText.replace(/\0/g, ''),
      choices: q.choices ? q.choices.replace(/\0/g, '') : null,
      correctAnswer: q.correctAnswer.replace(/\0/g, ''),
      sourceSet: q.sourceSet ?? null,
      sourceRound: q.sourceRound ?? null,
      source: q.source ?? null,
    });
  }

  console.log(`\nTo insert:         ${toInsert.length}`);
  console.log(`Skipped (dup in DB): ${skippedDupExisting}`);
  console.log(`Skipped (dup in batch): ${skippedDupRun}`);
  console.log(`Skipped (bad data): ${skippedBad}`);

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    await prisma.question.createMany({ data: batch });
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === toInsert.length) {
      console.log(`  Inserted ${inserted}/${toInsert.length}`);
    }
  }

  // Final stats
  const stats = await prisma.$queryRawUnsafe(
    'SELECT subject, COUNT(*)::int as count FROM "Question" GROUP BY subject ORDER BY count DESC'
  );
  console.log('\n=== DB After Import ===');
  for (const row of stats) {
    console.log(`  ${row.subject}: ${row.count}`);
  }
  const total = await prisma.question.count();
  console.log(`  TOTAL: ${total}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
