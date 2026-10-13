const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, '..', 'src', 'utils', 'sectionScores.js');
const src = fs.readFileSync(srcPath, 'utf8');

// Extract the function body for calculateSectionScoresFromText and evaluate it.
const fnMatch = src.match(/export function calculateSectionScoresFromText\([^\)]*\) \{([\s\S]*?)\n\}/);
if (!fnMatch) {
  console.error('Failed to locate scoring function in', srcPath);
  process.exit(2);
}

const fnBody = fnMatch[1];
const wrapper = `(function calculateSectionScoresFromText(cvText = "") {${fnBody}\n})`;
const script = new vm.Script(wrapper, { filename: 'sectionScores.wrapper.js' });
const fn = script.runInThisContext();

function computeFromMatched(matched, keywords) {
  const matchedNorm = matched.map(s => (s || '').toLowerCase());
  const hits = keywords.filter(k => {
    const key = k.toLowerCase();
    return matchedNorm.some(m => m.includes(key) || key.includes(m));
  }).length;
  return Math.min(98, Math.round((hits / keywords.length) * 100));
}

// Test 1: Text-based scoring
const sampleText = `Experienced software developer with Python, React, Node, AWS.\nDegree in Computer Science. Worked on databases and cloud.`;
console.log('Sample text:', sampleText);
console.log('Section scores from text:', fn(sampleText));

// Test 2: matchedKeywordsList-based scoring
const matched = ['Python', 'React Native', 'aws', 'sql'];
const sectionDefs = {
  skills: ["python","javascript","java","sql","html","css","react","node","git","api","database","cloud","linux","typescript","mongodb","mysql","firebase","docker","aws","azure"],
  experience: ["experience","worked","developed","built","managed","led","created","implemented","responsible","project","company","role","position","internship","employment"],
  education: ["degree","diploma","certificate","university","college","bachelor","honours","masters","qualification","studied","graduated","school","module","course"],
  formatting: ["skills","education","experience","references","summary","objective","contact","email","phone","address","profile","achievements","projects"]
};

console.log('\nMatched keywords:', matched);
console.log('Computed from matched -> Skills:', computeFromMatched(matched, sectionDefs.skills));
console.log('Computed from matched -> Experience:', computeFromMatched(matched, sectionDefs.experience));
console.log('Computed from matched -> Education:', computeFromMatched(matched, sectionDefs.education));
console.log('Computed from matched -> Formatting:', computeFromMatched(matched, sectionDefs.formatting));

console.log('\nTest script completed successfully.');
