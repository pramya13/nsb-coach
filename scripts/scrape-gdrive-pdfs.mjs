// Download 13 MIT 2020 Drive PDFs, parse questions, tag source
import https from 'https';
import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/build/pdf.mjs';

const DOWNLOAD_DIR = path.join(process.cwd(), 'scripts', 'pdfs-gdrive-mit2020');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'questions-gdrive-mit2020.json');
const SOURCE_TAG = 'gdrive-mit-2020';

const FILES = [
  { name: 'round1',  id: '1Nqy3b7PAWdE-5Ke6hLE6cR64niMAiGAB' },
  { name: 'round2',  id: '14sdVHNi2A-WrrAnaoS8MXLbyI2aKPz2e' },
  { name: 'round3',  id: '1jh7d8VollnE_YB6psQJjfM7wzzRChsTc' },
  { name: 'round4',  id: '1TfLmUHqDVenJGpTAs1llliqDDKVk_85i' },
  { name: 'round5',  id: '1-JagUYOwue32NXz6ei_L4z08LWe0D7LF' },
  { name: 'round6',  id: '1wOSwiVvhsFXfi-qh4Zzku5IpOv7DBVJe' },
  { name: 'round7',  id: '1qAmhNF51m_MF6qLjKgb9rL96a-UlTjbJ' },
  { name: 'round8',  id: '1QisSQa4_8syc_3gkvSUIDXKkZ0hVi9wQ' },
  { name: 'round9',  id: '1lJWMVaujBzMp-gAB60bof2yZJwP9l8a8' },
  { name: 'round10', id: '166naRd_4JYnjLEWvTpkTB6nv4xIW9hQZ' },
  { name: 'round11', id: '1j36mPr_pW-NS4rzLdhKE05UXA9ONestJ' },
  { name: 'round12', id: '1RPaUDc-ieZrNNYIe1nFTyxtgzpDxXMmr' },
  { name: 'round13', id: '1zgqXA-o0fcFnfE2nyZe3uop2MZ2q10Iw' },
];

const SUBJECT_MAP = {
  'BIOLOGY': 'LIFE_SCIENCE',
  'LIFE SCIENCE': 'LIFE_SCIENCE',
  'EARTH SCIENCE': 'EARTH_SPACE',
  'EARTH AND SPACE': 'EARTH_SPACE',
  'EARTH & SPACE': 'EARTH_SPACE',
  'ASTRONOMY': 'EARTH_SPACE',
  'CHEMISTRY': 'PHYSICAL_SCIENCE',
  'PHYSICS': 'PHYSICAL_SCIENCE',
  'PHYSICAL SCIENCE': 'PHYSICAL_SCIENCE',
  'MATH': 'MATH',
  'MATHEMATICS': 'MATH',
  'ENERGY': 'ENERGY',
  'GENERAL SCIENCE': 'PHYSICAL_SCIENCE',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(u, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          return doFetch(res.headers.location, redirects + 1);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), headers: res.headers }));
      }).on('error', reject);
    };
    doFetch(url);
  });
}

async function downloadDrivePdf(id, name) {
  const filepath = path.join(DOWNLOAD_DIR, `${name}.pdf`);
  if (fs.existsSync(filepath) && fs.statSync(filepath).size > 10000) return filepath;
  // Use direct download URL (works for public files under ~100MB)
  const url = `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0&confirm=t`;
  const { buf } = await fetchUrl(url);
  fs.writeFileSync(filepath, buf);
  return filepath;
}

async function extractTextFromPdf(filepath) {
  const data = new Uint8Array(fs.readFileSync(filepath));
  const doc = await getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join('') + '\n';
  }
  return fullText;
}

function parseQuestions(text, sourceRound, roundName) {
  const questions = [];
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const questionPattern = /(TOSS-UP|BONUS)\s*(\d+)\)\s*(BIOLOGY|LIFE SCIENCE|EARTH SCIENCE|EARTH AND SPACE|EARTH & SPACE|ASTRONOMY|CHEMISTRY|PHYSICS|PHYSICAL SCIENCE|MATH|MATHEMATICS|ENERGY|GENERAL SCIENCE)\s*(Multiple Choice|Short Answer)\s+([\s\S]*?)ANSWER:\s*([\s\S]*?)(?=(?:TOSS-UP|BONUS)\s*\d+\)|$)/gi;

  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    const questionType = match[1].toUpperCase().replace('-', '_');
    const questionNum = parseInt(match[2]);
    const rawSubject = match[3].toUpperCase().trim();
    const answerFormat = match[4].toLowerCase().includes('multiple') ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER';
    let questionText = match[5].trim();
    let answer = match[6].trim();

    answer = answer.replace(/High School.*?Page \d+/gi, '').trim();
    answer = answer.replace(/\(Solution:[\s\S]*?\)/gi, '').trim();

    const subject = SUBJECT_MAP[rawSubject] || 'PHYSICAL_SCIENCE';

    let choices = null;
    if (answerFormat === 'MULTIPLE_CHOICE') {
      const choicePattern = /([WXYZ]\))\s*([^WXYZ]*?)(?=(?:[WXYZ]\)|$))/g;
      const choiceMatches = [...questionText.matchAll(choicePattern)];
      if (choiceMatches.length >= 2) {
        choices = choiceMatches.map(cm => `${cm[1]} ${cm[2].trim()}`);
        const firstChoiceIdx = questionText.search(/W\)/);
        if (firstChoiceIdx > 0) {
          questionText = questionText.substring(0, firstChoiceIdx).trim();
        }
      }
    }

    if (answerFormat === 'MULTIPLE_CHOICE') {
      const letterMatch = match[6].trim().match(/^([WXYZ])\)/);
      if (letterMatch) answer = letterMatch[1];
      else answer = answer.replace(/^[WXYZ]\)\s*/, '').trim();
    }

    let difficulty = questionNum <= 10 ? 4 : 5; // MIT Invitational is hard
    if (questionType === 'BONUS') difficulty = 5;

    questions.push({
      subject,
      topic: rawSubject,
      difficulty,
      questionType,
      answerFormat,
      questionText: questionText.substring(0, 2000),
      choices: choices ? JSON.stringify(choices) : null,
      correctAnswer: String(answer).substring(0, 500),
      sourceSet: 2020,
      sourceRound,
      source: `${SOURCE_TAG}:${roundName}.pdf`,
    });
  }
  return questions;
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const allQuestions = [];
  for (let i = 0; i < FILES.length; i++) {
    const f = FILES[i];
    const roundNum = parseInt(f.name.replace('round', ''));
    process.stdout.write(`[${i + 1}/${FILES.length}] ${f.name}... `);
    try {
      const filepath = await downloadDrivePdf(f.id, f.name);
      const text = await extractTextFromPdf(filepath);
      const questions = parseQuestions(text, roundNum, f.name);
      allQuestions.push(...questions);
      console.log(`${questions.length} questions`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2));

  const subjects = {};
  for (const q of allQuestions) subjects[q.subject] = (subjects[q.subject] || 0) + 1;
  console.log('\n=== RESULTS ===');
  console.log(`Total: ${allQuestions.length}`);
  for (const [s, c] of Object.entries(subjects).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`);
  }
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
