// Scrape questions from sciencebowlprep.com
// Usage: node scripts/scrape-sciencebowlprep.mjs [limit]
//   limit: optional. Max number of question pages to fetch. Default: all (~24773).
import https from 'https';
import fs from 'fs';
import path from 'path';

const BASE = 'https://sciencebowlprep.com/questions';
const INDEX_URL = `${BASE}/index.html`;
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'sciencebowlprep-questions.json');
const URLS_FILE = path.join(process.cwd(), 'scripts', 'sciencebowlprep-urls.json');

const LIMIT = process.argv[2] ? parseInt(process.argv[2], 10) : Infinity;
const CONCURRENCY = 10;

const SUBJECT_MAP = {
  'MATH': 'MATH',
  'MATHEMATICS': 'MATH',
  'LIFE SCIENCE': 'LIFE_SCIENCE',
  'BIOLOGY': 'LIFE_SCIENCE',
  'EARTH SCIENCE': 'EARTH_SPACE',
  'EARTH AND SPACE': 'EARTH_SPACE',
  'ASTRONOMY': 'EARTH_SPACE',
  'PHYSICAL SCIENCE': 'PHYSICAL_SCIENCE',
  'PHYSICS': 'PHYSICAL_SCIENCE',
  'CHEMISTRY': 'PHYSICAL_SCIENCE',
  'GENERAL SCIENCE': 'PHYSICAL_SCIENCE',
  'ENERGY': 'ENERGY',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0 nsb-coach-scraper' } }, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doFetch(new URL(res.headers.location, u).toString(), redirects + 1);
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }).on('error', reject);
    };
    doFetch(url);
  });
}

function decodeHtml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripTags(html) {
  return decodeHtml(html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
}

async function fetchIndexUrls() {
  if (fs.existsSync(URLS_FILE)) {
    const cached = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
    console.log(`Using cached URLs: ${cached.length}`);
    return cached;
  }
  console.log('Fetching index page (~26 MB)...');
  const html = await fetchUrl(INDEX_URL);
  const matches = [...html.matchAll(/href="([A-Za-z0-9_\-]+\.html)"/g)];
  const seen = new Set();
  const urls = [];
  for (const m of matches) {
    const u = m[1];
    if (u === 'index.html') continue;
    if (seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  console.log(`Found ${urls.length} unique question URLs`);
  fs.writeFileSync(URLS_FILE, JSON.stringify(urls));
  return urls;
}

function parseQuestionHtml(html, slug) {
  // Subject from .category-badge
  const badgeMatch = html.match(/<div class="category-badge">([^<]+)<\/div>/);
  const rawSubject = badgeMatch ? badgeMatch[1].trim().toUpperCase() : '';
  const subject = SUBJECT_MAP[rawSubject] || null;
  if (!subject) return null; // skip unknown subjects

  // Meta info
  const metaMatches = [...html.matchAll(/<span>([^<]+)<\/span>/g)].map(m => m[1]);
  // metaMatches typically include: "📅 NSB Single Elimination 2008", "🎓 MS", "🔄 Round 1", "#️⃣ Question 1", "❓ TOSS-UP", "📝 Multiple Choice"
  const grade = metaMatches.find(m => /\b(MS|HS)\b/.test(m)) || '';
  const isHS = /HS/.test(grade);
  const roundMatch = metaMatches.find(m => /Round\s+\d+/i.test(m));
  const sourceRound = roundMatch ? parseInt(roundMatch.match(/(\d+)/)[1], 10) : null;
  const setMatch = metaMatches.find(m => /(\d{4})/.test(m));
  const sourceSet = setMatch ? parseInt(setMatch.match(/(\d{4})/)[1], 10) : null;

  const typeMeta = metaMatches.find(m => /(TOSS-?UP|BONUS)/i.test(m)) || '';
  const questionType = /BONUS/i.test(typeMeta) ? 'BONUS' : 'TOSS_UP';
  const formatMeta = metaMatches.find(m => /(Multiple Choice|Short Answer)/i.test(m)) || '';
  const answerFormat = /Short Answer/i.test(formatMeta) ? 'SHORT_ANSWER' : 'MULTIPLE_CHOICE';

  // Question text
  const qMatch = html.match(/<p class="question-text">([\s\S]*?)<\/p>/);
  const questionText = qMatch ? stripTags(qMatch[1]) : null;
  if (!questionText) return null;

  // Choices (for MC)
  let choices = null;
  if (answerFormat === 'MULTIPLE_CHOICE') {
    const choiceMatches = [...html.matchAll(
      /<span class="choice-letter">([WXYZ])\)<\/span>([\s\S]*?)<\/div>/g
    )];
    if (choiceMatches.length >= 2) {
      const arr = choiceMatches.map(m => `${m[1]}) ${stripTags(m[2])}`);
      choices = JSON.stringify(arr);
    }
  }

  // Correct answer
  const ansMatch = html.match(/<span class="answer-value">([\s\S]*?)<\/span>/);
  const correctAnswer = ansMatch ? stripTags(ansMatch[1]) : null;
  if (!correctAnswer) return null;

  // Difficulty: MS=3, HS=4 baseline; BONUS+1 if MS, +0 if HS (BONUS generally harder)
  const difficulty = isHS ? (questionType === 'BONUS' ? 5 : 4) : (questionType === 'BONUS' ? 4 : 3);

  return {
    subject,
    topic: '',
    difficulty,
    questionType,
    answerFormat,
    questionText,
    choices,
    correctAnswer,
    sourceSet,
    sourceRound,
    source: `sciencebowlprep:${slug}`,
    grade: isHS ? 'HS' : 'MS',
  };
}

async function processWithConcurrency(items, worker, concurrency) {
  const results = [];
  let idx = 0;
  const workers = Array(concurrency).fill(0).map(async () => {
    while (idx < items.length) {
      const myIdx = idx++;
      try {
        const r = await worker(items[myIdx], myIdx);
        if (r) results.push(r);
      } catch (e) {
        console.error(`  Error at ${myIdx} (${items[myIdx]}): ${e.message}`);
      }
      if ((myIdx + 1) % 200 === 0) {
        console.log(`  Processed ${myIdx + 1}/${items.length} (${results.length} parsed so far)`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const urls = await fetchIndexUrls();
  const toFetch = urls.slice(0, LIMIT);
  console.log(`Fetching ${toFetch.length} question pages with concurrency=${CONCURRENCY}...`);

  const results = await processWithConcurrency(
    toFetch,
    async (slug) => {
      const html = await fetchUrl(`${BASE}/${slug}`);
      return parseQuestionHtml(html, slug);
    },
    CONCURRENCY
  );

  console.log(`\nParsed ${results.length} questions. Writing to ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  // Stats
  const bySubject = {};
  for (const q of results) {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
  }
  console.log('\n=== Scrape Stats ===');
  for (const [k, v] of Object.entries(bySubject).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`  TOTAL: ${results.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
