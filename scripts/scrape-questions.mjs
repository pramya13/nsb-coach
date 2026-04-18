import https from 'https';
import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/build/pdf.mjs';

const BASE = 'https://science.osti.gov';
const DOWNLOAD_DIR = path.join(process.cwd(), 'scripts', 'pdfs');
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'questions.json');

// Subject mapping from NSB labels to our DB values
const SUBJECT_MAP = {
  'BIOLOGY': 'LIFE_SCIENCE',
  'LIFE SCIENCE': 'LIFE_SCIENCE',
  'LIFE, PERSONAL & SOCIAL SCIENCE': 'LIFE_SCIENCE',
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
      const mod = u.startsWith('https') ? https : https;
      mod.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doFetch(res.headers.location, redirects + 1);
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    };
    doFetch(url);
  });
}

async function extractPdfLinks() {
  console.log('Fetching DOE sample questions page...');
  const html = (await fetchUrl(BASE + '/wdts/nsb/Regional-Competitions/Resources/HS-Sample-Questions')).toString();
  const matches = [...html.matchAll(/href="(\/-\/media\/wdts\/nsb\/pdf\/HS-Sample-Questions\/[^"]+\.pdf)"/gi)];
  const urls = matches.map(m => m[1]);
  console.log(`Found ${urls.length} PDF links`);
  return urls;
}

async function downloadPdf(relUrl) {
  const filename = relUrl.replace(/\/-\/media\/wdts\/nsb\/pdf\/HS-Sample-Questions\//i, '').replace(/\//g, '_');
  const filepath = path.join(DOWNLOAD_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  
  const buf = await fetchUrl(BASE + relUrl);
  fs.writeFileSync(filepath, buf);
  return filepath;
}

async function extractTextFromPdf(filepath) {
  const data = new Uint8Array(fs.readFileSync(filepath));
  try {
    const doc = await getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join('');
      fullText += text + '\n';
    }
    return fullText;
  } catch (e) {
    console.error(`  Error parsing ${filepath}: ${e.message}`);
    return '';
  }
}

function parseSetAndRound(relUrl) {
  // Extract set number and round number from URL
  const setMatch = relUrl.match(/Sample-Set-(\d+)/i);
  const roundMatch = relUrl.match(/[Rr]ound[-_]?(\d+)/i);
  const energyMatch = relUrl.match(/[Ee]nergy/i);
  
  const set = setMatch ? parseInt(setMatch[1]) : null;
  let round = roundMatch ? parseInt(roundMatch[1]) : null;
  if (energyMatch && !round) round = 99; // special energy round
  
  return { set, round };
}

function parseQuestions(text, sourceSet, sourceRound) {
  const questions = [];
  
  // Clean up text - normalize whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Pattern to match TOSS-UP or BONUS followed by number and subject
  // Format: TOSS-UP\d+) SUBJECT AnswerFormat QuestionText ANSWER: AnswerText
  const questionPattern = /(TOSS-UP|BONUS)\s*(\d+)\)\s*(BIOLOGY|LIFE SCIENCE|LIFE, PERSONAL & SOCIAL SCIENCE|EARTH SCIENCE|EARTH AND SPACE|EARTH & SPACE|ASTRONOMY|CHEMISTRY|PHYSICS|PHYSICAL SCIENCE|MATH|MATHEMATICS|ENERGY|GENERAL SCIENCE)\s*(Multiple Choice|Short Answer)\s+([\s\S]*?)ANSWER:\s*([\s\S]*?)(?=(?:TOSS-UP|BONUS)\s*\d+\)|$)/gi;
  
  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    const questionType = match[1].toUpperCase().replace('-', '_'); // TOSS_UP or BONUS
    const questionNum = parseInt(match[2]);
    const rawSubject = match[3].toUpperCase().trim();
    const answerFormat = match[4].toLowerCase().includes('multiple') ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER';
    let questionText = match[5].trim();
    let answer = match[6].trim();
    
    // Clean up answer - remove trailing page markers
    answer = answer.replace(/High School.*?Page \d+/gi, '').trim();
    // Remove solution explanations
    answer = answer.replace(/\(Solution:[\s\S]*?\)/gi, '').trim();
    
    const subject = SUBJECT_MAP[rawSubject] || 'PHYSICAL_SCIENCE';
    
    // Extract choices for multiple choice
    let choices = null;
    if (answerFormat === 'MULTIPLE_CHOICE') {
      const choicePattern = /([WXYZ]\))\s*([^WXYZ]*?)(?=(?:[WXYZ]\)|$))/g;
      const choiceMatches = [...questionText.matchAll(choicePattern)];
      if (choiceMatches.length >= 2) {
        choices = choiceMatches.map(cm => `${cm[1]} ${cm[2].trim()}`);
        // Remove choices from question text
        const firstChoiceIdx = questionText.search(/W\)/);
        if (firstChoiceIdx > 0) {
          questionText = questionText.substring(0, firstChoiceIdx).trim();
        }
      }
    }
    
    // Clean answer - for MC get just the letter+text
    if (answerFormat === 'MULTIPLE_CHOICE') {
      answer = answer.replace(/^[WXYZ]\)\s*/, '').trim();
      const letterMatch = match[6].trim().match(/^([WXYZ])\)/);
      if (letterMatch) {
        answer = letterMatch[1];
      }
    }
    
    // Estimate difficulty based on question number in round
    // Earlier questions tend to be easier
    let difficulty;
    if (questionNum <= 5) difficulty = 2;
    else if (questionNum <= 10) difficulty = 3;
    else if (questionNum <= 15) difficulty = 3;
    else if (questionNum <= 20) difficulty = 4;
    else difficulty = 4;
    
    // Bonus questions are slightly harder
    if (questionType === 'BONUS') difficulty = Math.min(5, difficulty + 1);
    
    // Later sets tend to be harder
    if (sourceSet >= 10) difficulty = Math.min(5, difficulty + 1);
    
    questions.push({
      subject,
      topic: rawSubject,
      difficulty,
      questionType: questionType === 'TOSS_UP' ? 'TOSS_UP' : 'BONUS',
      answerFormat,
      questionText: questionText.substring(0, 2000),
      choices: choices ? JSON.stringify(choices) : null,
      correctAnswer: answer.substring(0, 500),
      sourceSet,
      sourceRound,
    });
  }
  
  return questions;
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  
  const pdfUrls = await extractPdfLinks();
  const allQuestions = [];
  let downloadErrors = 0;
  
  for (let i = 0; i < pdfUrls.length; i++) {
    const relUrl = pdfUrls[i];
    const { set, round } = parseSetAndRound(relUrl);
    const label = `Set ${set} Round ${round}`;
    
    process.stdout.write(`[${i + 1}/${pdfUrls.length}] ${label}... `);
    
    try {
      const filepath = await downloadPdf(relUrl);
      const text = await extractTextFromPdf(filepath);
      const questions = parseQuestions(text, set, round);
      allQuestions.push(...questions);
      console.log(`${questions.length} questions`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      downloadErrors++;
    }
    
    // Small delay to be nice to the server
    if (i % 10 === 9) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Write all questions to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2));
  
  // Stats
  const subjects = {};
  for (const q of allQuestions) {
    subjects[q.subject] = (subjects[q.subject] || 0) + 1;
  }
  
  console.log('\n=== RESULTS ===');
  console.log(`Total questions parsed: ${allQuestions.length}`);
  console.log(`Download errors: ${downloadErrors}`);
  console.log('By subject:');
  for (const [s, c] of Object.entries(subjects).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`);
  }
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch(e => console.error('Fatal:', e));
