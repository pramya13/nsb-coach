// Import parsed NSB questions into the database
const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const questionsFile = path.join(__dirname, 'questions.json');
  if (!fs.existsSync(questionsFile)) {
    console.error('questions.json not found. Run scrape-questions.mjs first.');
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf8'));
  console.log(`Loaded ${questions.length} questions from JSON`);

  // Check existing count
  const existing = await prisma.question.count();
  console.log(`Existing questions in DB: ${existing}`);

  if (existing > 0) {
    console.log('Clearing existing questions...');
    await prisma.quizAnswer.deleteMany({});
    await prisma.question.deleteMany({});
  }

  // Batch insert in chunks of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    await prisma.question.createMany({
      data: batch.map(q => ({
        subject: q.subject,
        topic: (q.topic || '').replace(/\0/g, ''),
        difficulty: q.difficulty,
        questionType: q.questionType,
        answerFormat: q.answerFormat,
        questionText: (q.questionText || '').replace(/\0/g, ''),
        choices: q.choices ? q.choices.replace(/\0/g, '') : null,
        correctAnswer: (q.correctAnswer || '').replace(/\0/g, ''),
        sourceSet: q.sourceSet,
        sourceRound: q.sourceRound,
      })),
    });
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === questions.length) {
      console.log(`  Inserted ${inserted}/${questions.length}`);
    }
  }

  // Print stats
  const stats = await prisma.$queryRawUnsafe(`
    SELECT subject, COUNT(*)::int as count FROM "Question" GROUP BY subject ORDER BY count DESC
  `);
  console.log('\n=== Database Stats ===');
  for (const row of stats) {
    console.log(`  ${row.subject}: ${row.count}`);
  }
  const total = await prisma.question.count();
  console.log(`  TOTAL: ${total}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
