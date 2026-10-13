// src/utils/sectionScores.js
// Client-side copy of the section scoring logic used in Cloud Functions.
export function calculateSectionScoresFromText(cvText = "") {
  const lower = (cvText || "").toLowerCase();

  const skillsKeywords = ["python", "javascript", "java", "sql", "html", "css", "react", "node", "git", "api", "database", "cloud", "linux", "typescript", "mongodb", "mysql", "firebase", "docker", "aws", "azure"];
  const expKeywords = ["experience", "worked", "developed", "built", "managed", "led", "created", "implemented", "responsible", "project", "company", "role", "position", "internship", "employment"];
  const eduKeywords = ["degree", "diploma", "certificate", "university", "college", "bachelor", "honours", "masters", "qualification", "studied", "graduated", "school", "module", "course"];
  const formatKeywords = ["skills", "education", "experience", "references", "summary", "objective", "contact", "email", "phone", "address", "profile", "achievements", "projects"];

  function sectionScore(keywords) {
    const hits = keywords.filter(k => lower.includes(k)).length;
    return Math.min(98, Math.round((hits / keywords.length) * 100));
  }

  return {
    skillsScore: sectionScore(skillsKeywords),
    experienceScore: sectionScore(expKeywords),
    educationScore: sectionScore(eduKeywords),
    formattingScore: sectionScore(formatKeywords),
  };
}

export default calculateSectionScoresFromText;
