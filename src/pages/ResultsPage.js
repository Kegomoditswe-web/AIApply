// src/pages/ResultsPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";

export default function ResultsPage() {
  const { resultID } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResult() {
      if (!resultID) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "atsResults", resultID));
        if (snap.exists()) {
          setResult({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching result:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [resultID]);

  // If section scores are missing from the stored result, attempt to compute them
  // from the saved CV text (cvs collection) and merge into the local `result`.
  useEffect(() => {
    async function ensureSectionScores() {
      if (!result) return;
      // If any score is already a positive number, nothing to do
      const hasPositiveScore = (num) => typeof num === "number" && num > 0;
      if (hasPositiveScore(result.skillsScore) || hasPositiveScore(result.experienceScore) || hasPositiveScore(result.educationScore) || hasPositiveScore(result.formattingScore)) return;

      // First fallback: compute scores from matchedKeywordsList (available in result)
      try {
        const matched = Array.isArray(result.matchedKeywordsList) ? result.matchedKeywordsList.map(s => (s || "").toLowerCase()) : [];
        if (matched.length > 0) {
          const mod = await import("../utils/sectionScores");
          const sectionDefs = {
            skills: ["python", "javascript", "java", "sql", "html", "css", "react", "node", "git", "api", "database", "cloud", "linux", "typescript", "mongodb", "mysql", "firebase", "docker", "aws", "azure"],
            experience: ["experience", "worked", "developed", "built", "managed", "led", "created", "implemented", "responsible", "project", "company", "role", "position", "internship", "employment"],
            education: ["degree", "diploma", "certificate", "university", "college", "bachelor", "honours", "masters", "qualification", "studied", "graduated", "school", "module", "course"],
            formatting: ["skills", "education", "experience", "references", "summary", "objective", "contact", "email", "phone", "address", "profile", "achievements", "projects"]
          };

          const matchedNorm = matched.map(s => (s || "").toLowerCase());
          const computeFromMatched = (keywords) => {
            const hits = keywords.filter(k => {
              const key = k.toLowerCase();
              return matchedNorm.some(m => m.includes(key) || key.includes(m));
            }).length;
            return Math.min(98, Math.round((hits / keywords.length) * 100));
          };

          const scores = {
            skillsScore: computeFromMatched(sectionDefs.skills),
            experienceScore: computeFromMatched(sectionDefs.experience),
            educationScore: computeFromMatched(sectionDefs.education),
            formattingScore: computeFromMatched(sectionDefs.formatting),
          };
          setResult(prev => ({ ...prev, ...scores }));
          return;
        }
      } catch (err) {
        console.error("Failed to compute section scores from matched keywords:", err);
      }

      // Second fallback: try to fetch CV text using cvID and compute from text
      if (!result.cvID) return;

      try {
        const cvSnap = await getDoc(doc(db, "cvs", result.cvID));
        if (cvSnap.exists()) {
          const cv = cvSnap.data();
          const extractedText = cv.extractedText || cv.fileText || "";
          if (extractedText) {
            const mod = await import("../utils/sectionScores");
            const scores = mod.calculateSectionScoresFromText(extractedText);
            setResult(prev => ({ ...prev, ...scores }));
          }
        }
      } catch (err) {
        console.error("Failed to compute fallback section scores:", err);
      }
    }

    ensureSectionScores();
  }, [result]);

  function scoreColor(score) {
    if (score >= 75) return "#276749";
    if (score >= 50) return "#c05621";
    return "#c53030";
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }

  if (loading) return <><Navbar /><div className="main"><p style={{ color: "#718096" }}>Loading results...</p></div></>;
  if (!result) return <><Navbar /><div className="main"><p className="error-msg">Result not found.</p></div></>;

  const matched = result.matchedKeywordsList || [];
  const missing = result.missingKeywordsList || [];

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="page-title">ATS Analysis Results</div>
        <div className="page-sub">{result.jobTitle}{result.companyName ? ` — ${result.companyName}` : ""} — Analysed {formatDate(result.analysisDate)}</div>

        {/* Top stats */}
        <div className="grid3" style={{ marginBottom: 20 }}>
          <div className="stat">
            <div className="stat-num" style={{ color: scoreColor(result.atsScore) }}>{result.atsScore}%</div>
            <div className="stat-label">ATS Compatibility Score</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${result.atsScore}%`, background: scoreColor(result.atsScore) }} />
            </div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: "#2b6cb0" }}>{result.keywordsMatched}/{result.keywordsMatched + result.keywordsMissing}</div>
            <div className="stat-label">Keywords Matched</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${Math.round(result.keywordsMatched / (result.keywordsMatched + result.keywordsMissing) * 100)}%`, background: "#2b6cb0" }} />
            </div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: "#c53030" }}>{result.keywordsMissing}</div>
            <div className="stat-label">Missing Keywords</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${Math.round(result.keywordsMissing / (result.keywordsMatched + result.keywordsMissing) * 100)}%`, background: "#e53e3e" }} />
            </div>
          </div>
        </div>

        <div className="grid2">
          {/* Keyword match */}
          <div className="card">
            <div className="card-title">Keyword Match Report</div>
            <div style={{ marginBottom: 10 }}><strong style={{ fontSize: 13, color: "#276749" }}>✅ Present in your CV</strong></div>
            <div style={{ marginBottom: 16 }}>
              {matched.length > 0
                ? matched.map((kw, i) => <span key={i} className="chip chip-present">{kw}</span>)
                : <span style={{ fontSize: 13, color: "#718096" }}>None detected</span>}
            </div>
            <div style={{ marginBottom: 10 }}><strong style={{ fontSize: 13, color: "#c53030" }}>❌ Missing from your CV</strong></div>
            <div>
              {missing.length > 0
                ? missing.map((kw, i) => <span key={i} className="chip chip-missing">{kw}</span>)
                : <span style={{ fontSize: 13, color: "#276749" }}>No missing keywords! 🎉</span>}
            </div>
          </div>

          {/* Section scores */}
          <div className="card">
            <div className="card-title">Section Scores</div>
            {[
              { label: "Technical Skills", score: result.skillsScore || 0 },
              { label: "Work Experience", score: result.experienceScore || 0 },
              { label: "Education", score: result.educationScore || 0 },
              { label: "CV Formatting", score: result.formattingScore || 0 },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{s.score}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${s.score}%`, background: s.score >= 70 ? "#276749" : "#c05621" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          <Link to={`/suggestions/${resultID}`} className="btn btn-primary">View Suggestions →</Link>
          <Link to={`/cover-letter/${resultID}`} className="btn btn-success">Generate Cover Letter</Link>
        </div>
      </div>
      <div className="footer">AI-Powered Job Application System | Sol Plaatje University | NPRJ740 — 2026</div>
    </>
  );
}
