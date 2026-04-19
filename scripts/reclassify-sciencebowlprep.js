// Reclassify sciencebowlprep rows using granular subject JSON, and import any new ones.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().slice(0, 200);
}

async function main() {
  const file = path.join(__dirname, 'sciencebowlprep-questions.json');
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Loaded ${items.length} items from JSON`);

  // Build map: normalized text -> {subject, topic, source}
  const map = new Map();
  for (const q of items) {
    const key = normalize(q.questionText);
    if (!key) continue;
    if (!map.has(key)) map.set(key, q);
  }
  console.log(`Unique normalized keys: ${map.size}`);

  // Pull sciencebowlprep rows from DB in batches, update subject/topic where different
  let offset = 0;
  const batchSize = 2000;
  let updated = 0;
  let matched = 0;
  const dbKeys = new Set();
  while (true) {
    const rows = await prisma.question.findMany({
      where: { source: { startsWith: 'sciencebowlprep' } },
      select: { id: true, questionText: true, subject: true, topic: true },
      skip: offset,
      take: batchSize,
      orderBy: { id: 'asc' },
    });
    if (rows.length === 0) break;
    const toUpdate = [];
    for (const row of rows) {
      const key = normalize(row.questionText);
      dbKeys.add(key);
      const match = map.get(key);
      if (!match) continue;
      matched++;
      if (row.subject !== match.subject || (row.topic || '') !== (match.topic || '')) {
        toUpdate.push({ id: row.id, subject: match.subject, topic: match.topic || '' });
      }
    }
    // Bulk update via single SQL statement per batch using VALUES
    if (toUpdate.length > 0) {
      const chunk = 500;
      for (let i = 0; i < toUpdate.length; i += chunk) {
        const slice = toUpdate.slice(i, i + chunk);
        const values = slice.map((_, idx) => `($${idx*3+1}::text, $${idx*3+2}::text, $${idx*3+3}::text)`).join(',');
        const params = slice.flatMap(u => [u.id, u.subject, u.topic]);
        const sql = `UPDATE "Question" AS q SET subject = v.subject, topic = v.topic FROM (VALUES ${values}) AS v(id, subject, topic) WHERE q.id = v.id`;
        await prisma.$executeRawUnsafe(sql, ...params);
        updated += slice.length;
      }
    }
    offset += rows.length;
    console.log(`  processed ${offset} DB rows, matched=${matched}, updated=${updated}`);
  }

  // Import truly new rows (in JSON but not in DB)
  let inserted = 0;
  for (const [key, q] of map.entries()) {
    if (dbKeys.has(key)) continue;
    try {
      if (!q.questionText || !q.correctAnswer || !q.subject) continue;
      await prisma.question.create({
        data: {
          questionText: q.questionText.replace(/\0/g, ''),
          questionType: q.questionType || 'TOSS_UP',
          answerFormat: q.answerFormat || 'MULTIPLE_CHOICE',
          choices: q.choices ? (typeof q.choices === 'string' ? q.choices : JSON.stringify(q.choices)) : null,
          correctAnswer: q.correctAnswer,
          subject: q.subject,
          topic: q.topic || '',
          difficulty: typeof q.difficulty === 'number' ? q.difficulty : 4,
          source: q.source || null,
        },
      });
      inserted++;
    } catch (e) {
      // skip
    }
  }
  console.log(`\nReclassified: ${updated} rows. Inserted new: ${inserted} rows.`);

  const dist = await prisma.$queryRawUnsafe(
    'SELECT subject, COUNT(*)::int as n FROM "Question" GROUP BY subject ORDER BY n DESC'
  );
  console.log('\n=== Final subject distribution ===');
  console.table(dist);
  const total = await prisma.question.count();
  console.log(`TOTAL: ${total}`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
