// functions/backfill_scores.js
// One-off script to extract PDF text for existing cvs and backfill section scores

const admin = require('firebase-admin');
const pdfParse = require('pdf-parse');

admin.initializeApp();
const db = admin.firestore();

function calculateSectionScores(cvText) {
  const lower = (cvText || '').toLowerCase();
  const skillsKeywords  = ["python","javascript","java","sql","html","css","react","node","git","api","database","cloud","linux","typescript","mongodb","mysql","firebase","docker","aws","azure"];
  const expKeywords     = ["experience","worked","developed","built","managed","led","created","implemented","responsible","project","company","role","position","internship","employment"];
  const eduKeywords     = ["degree","diploma","certificate","university","college","bachelor","honours","masters","qualification","studied","graduated","school","module","course"];
  const formatKeywords  = ["skills","education","experience","references","summary","objective","contact","email","phone","address","profile","achievements","projects"];

  function sectionScore(keywords) {
    const hits = keywords.filter(k => lower.includes(k)).length;
    return Math.min(98, Math.round((hits / keywords.length) * 100));
  }

  return {
    skillsScore:     sectionScore(skillsKeywords),
    experienceScore: sectionScore(expKeywords),
    educationScore:  sectionScore(eduKeywords),
    formattingScore: sectionScore(formatKeywords),
  };
}

async function downloadBufferFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}

async function backfill() {
  console.log('Starting backfill: scanning cvs for PDFs needing extraction');
  const cvsSnap = await db.collection('cvs').where('fileType', '==', 'PDF').get();
  console.log(`Found ${cvsSnap.size} PDF cvs`);

  for (const doc of cvsSnap.docs) {
    const id = doc.id;
    const data = doc.data();
    const extracted = data.extractedText || '';
    if (extracted && extracted.length > 20) {
      console.log(`Skipping ${id} — already has extractedText (${extracted.length} chars)`);
      continue;
    }

    const filePath = data.filePath;
    if (!filePath) {
      console.warn(`Skipping ${id} — no filePath`);
      continue;
    }

    try {
      console.log(`Downloading ${id} from ${filePath}`);
      const buf = await downloadBufferFromUrl(filePath);
      console.log(`Parsing PDF ${id} (${buf.length} bytes)`);
      const pdfData = await pdfParse(buf);
      const text = (pdfData && pdfData.text) ? pdfData.text : '';
      if (text && text.length > 20) {
        await db.collection('cvs').doc(id).update({ extractedText: text });
        console.log(`Updated cvs/${id} extractedText (${text.length} chars)`);

        const scores = calculateSectionScores(text);
        // Update related atsResults documents
        const q = await db.collection('atsResults').where('cvID', '==', id).get();
        for (const r of q.docs) {
          await db.collection('atsResults').doc(r.id).update({
            skillsScore: scores.skillsScore,
            experienceScore: scores.experienceScore,
            educationScore: scores.educationScore,
            formattingScore: scores.formattingScore
          });
          console.log(`Updated atsResults/${r.id} with new section scores`);
        }
      } else {
        console.warn(`PDF ${id} parsed but produced no text or too short`);
      }
    } catch (err) {
      console.error(`Failed to process cvs/${id}:`, err.message || err);
    }
  }

  console.log('Backfill complete');
  process.exit(0);
}

backfill().catch(err => { console.error(err); process.exit(1); });
