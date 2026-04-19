// Reclassify subject on existing rows whose topic already holds the raw subject.
// Works for doe-hs, doe-ms, gdrive-mit-2020-HS:* sources.
// For sciencebowlprep rows (topic=''), run reclassify-sciencebowlprep.js after re-scrape.
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

const MAP = {
  'MATH': 'MATH',
  'MATHEMATICS': 'MATH',
  'LIFE SCIENCE': 'LIFE_SCIENCE',
  'BIOLOGY': 'BIOLOGY',
  'EARTH SCIENCE': 'EARTH_SCIENCE',
  'EARTH AND SPACE': 'EARTH_AND_SPACE',
  'EARTH AND SPACE SCIENCE': 'EARTH_AND_SPACE',
  'EARTH & SPACE': 'EARTH_AND_SPACE',
  'ASTRONOMY': 'ASTRONOMY',
  'PHYSICAL SCIENCE': 'PHYSICAL_SCIENCE',
  'GENERAL SCIENCE': 'GENERAL_SCIENCE',
  'PHYSICS': 'PHYSICS',
  'CHEMISTRY': 'CHEMISTRY',
  'ENERGY': 'ENERGY',
};

async function main() {
  for (const [topic, subject] of Object.entries(MAP)) {
    const r = await prisma.question.updateMany({
      where: { topic, NOT: { subject } },
      data: { subject },
    });
    if (r.count > 0) console.log(`topic='${topic}' -> subject='${subject}': ${r.count} rows`);
  }
  const dist = await prisma.$queryRawUnsafe(
    'SELECT subject, COUNT(*)::int as n FROM "Question" GROUP BY subject ORDER BY n DESC'
  );
  console.log('\n=== Subject distribution ===');
  console.table(dist);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
