// Backfill `source` on existing Question rows based on normalized text match
// against the source JSON files.
// Tagging:
//   - questions.json            -> doe-hs
//   - questions-ms.json         -> doe-ms
//   - sciencebowlprep-questions.json -> sciencebowlprep-<grade> (MS or HS)
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
  const sourceFiles = [
    { file: 'scripts/questions.json',                 tagFn: () => 'doe-hs' },
    { file: 'scripts/questions-ms.json',              tagFn: () => 'doe-ms' },
    { file: 'scripts/sciencebowlprep-questions.json', tagFn: (q) => `sciencebowlprep-${q.grade || 'unknown'}` },
  ];

  // Build normalized text -> source tag map (first wins; later files don't overwrite existing tags)
  const keyToTag = new Map();
  for (const { file, tagFn } of sourceFiles) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) { console.log(`SKIP ${file} (not found)`); continue; }
    const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
    let mapped = 0;
    for (const q of arr) {
      const key = normalize(q.questionText);
      if (!key) continue;
      if (!keyToTag.has(key)) { keyToTag.set(key, tagFn(q)); mapped++; }
    }
    console.log(`${file}: ${arr.length} rows, ${mapped} new keys mapped`);
  }
  console.log(`\nTotal unique normalized keys in JSONs: ${keyToTag.size}`);

  // Load DB rows lacking source
  console.log('\nLoading DB rows with source IS NULL...');
  const rows = await prisma.question.findMany({
    where: { source: null },
    select: { id: true, questionText: true },
  });
  console.log(`Rows needing tags: ${rows.length}`);

  // Group row IDs by target tag for bulk updates
  const tagToIds = new Map();
  let matched = 0, unmatched = 0;
  for (const r of rows) {
    const key = normalize(r.questionText);
    const tag = keyToTag.get(key);
    if (tag) {
      if (!tagToIds.has(tag)) tagToIds.set(tag, []);
      tagToIds.get(tag).push(r.id);
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`\nMatched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log('Will apply updates by tag:');
  for (const [tag, ids] of tagToIds) console.log(`  ${tag}: ${ids.length}`);

  // Apply updates in batches per tag
  for (const [tag, ids] of tagToIds) {
    const BATCH = 500;
    let done = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      await prisma.question.updateMany({ where: { id: { in: batch } }, data: { source: tag } });
      done += batch.length;
    }
    console.log(`  ✓ ${tag}: ${done} updated`);
  }

  // Final stats
  const counts = await prisma.$queryRawUnsafe(
    'SELECT COALESCE(source, \'(none)\') as source, COUNT(*)::int as count FROM "Question" GROUP BY source ORDER BY count DESC'
  );
  console.log('\n=== Source distribution ===');
  for (const row of counts) console.log(`  ${row.source}: ${row.count}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
