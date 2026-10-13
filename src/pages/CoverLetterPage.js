// src/pages/CoverLetterPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function CoverLetterPage() {
  const { resultID } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [result, setResult] = useState(null);
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const userName = currentUser?.displayName || "Applicant";

  useEffect(() => {
    async function fetchData() {
      if (!resultID) {
        setLoading(false);
        return;
      }

      try {
        const resultSnap = await getDoc(doc(db, "atsResults", resultID));
        if (resultSnap.exists()) {
          const r = { id: resultSnap.id, ...resultSnap.data() };
          setResult(r);

          const q = query(collection(db, "coverLetters"), where("resultID", "==", resultID));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setLetter({ id: snap.docs[0].id, ...snap.docs[0].data() });
          }
        }
      } catch (err) {
        console.error("Error fetching cover letter context:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [resultID]);

  async function generateLetter() {
    setGenerating(true);
    try {
      const generateCoverLetter = httpsCallable(functions, "generateCoverLetter");
      const res = await generateCoverLetter({
        resultID,
        userID: currentUser.uid,
        userName,
        jobTitle: result.jobTitle,
        companyName: result.companyName || "the company",
        matchedKeywords: result.matchedKeywordsList || [],
        missingKeywords: result.missingKeywordsList || [],
        atsScore: result.atsScore
      });

      // Save to Firestore
      const docRef = await addDoc(collection(db, "coverLetters"), {
        resultID,
        userID: currentUser.uid,
        letterContent: res.data.letterContent,
        keywordsIncluded: res.data.keywordsIncluded,
        versionNumber: (letter?.versionNumber || 0) + 1,
        isEdited: false,
        generatedDate: serverTimestamp()
      });

      setLetter({
        id: docRef.id,
        letterContent: res.data.letterContent,
        keywordsIncluded: res.data.keywordsIncluded,
        versionNumber: (letter?.versionNumber || 0) + 1
      });
    } catch (err) {
      console.error("Cover letter generation failed:", err);
    }
    setGenerating(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(letter?.letterContent || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    const blob = new Blob([letter.letterContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${result?.jobTitle?.replace(/\s+/g, "_") || "Job"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <><Navbar /><div className="main"><p style={{ color: "#718096" }}>Loading...</p></div></>;

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="page-title">Cover Letter Generator</div>
        <div className="page-sub">
          AI-optimised and ATS-compliant — tailored for {result?.jobTitle || "your application"}
          {result?.companyName && ` at ${result.companyName}`}
        </div>

        {!letter && !generating && (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <div style={{ fontWeight: 600, fontSize: 18, color: "#1a365d", marginBottom: 8 }}>Generate Your Cover Letter</div>
            <p style={{ color: "#718096", fontSize: 14, marginBottom: 24 }}>
              Our AI will create a personalised, ATS-optimised cover letter based on your CV analysis results,
              incorporating the matched keywords from the job description.
            </p>
            <button className="btn btn-success" onClick={generateLetter}>✨ Generate Cover Letter</button>
          </div>
        )}

        {generating && (
          <div className="card" style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✍️</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#1a365d", marginBottom: 8 }}>Writing your cover letter...</div>
            <p style={{ color: "#718096", fontSize: 14 }}>Incorporating your matched keywords and tailoring the content.</p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 36, height: 36, border: "4px solid #e2e8f0", borderTopColor: "#276749", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          </div>
        )}

        {letter && !generating && (
          <div className="grid2">
            {/* Letter preview */}
            <div className="card">
              <div className="card-title">
                Cover Letter Preview
                {letter.versionNumber > 1 && <span style={{ marginLeft: 8 }} className="badge badge-blue">v{letter.versionNumber}</span>}
              </div>
              <div style={{ background: "#f7fafc", borderRadius: 8, padding: 20, fontSize: 13, lineHeight: 1.9, color: "#2d3748", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", maxHeight: 420, overflowY: "auto" }}>
                {letter.letterContent}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="card">
                <div className="card-title">ATS Keywords Included</div>
                <div>
                  {(letter.keywordsIncluded || []).map((kw, i) => (
                    <span key={i} className="chip chip-present">{kw}</span>
                  ))}
                </div>
              </div>
              <div className="card" style={{ marginTop: 0 }}>
                <div className="card-title">Download / Actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="btn btn-primary btn-full" onClick={handleCopy}>
                    {copied ? "✅ Copied!" : "📋 Copy to Clipboard"}
                  </button>
                  <button className="btn btn-secondary btn-full" onClick={handleDownloadTxt}>📄 Download as .txt</button>
                  <button className="btn btn-secondary btn-full" onClick={generateLetter}>🔄 Regenerate</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/suggestions/${resultID}`)}>← Back to Suggestions</button>
          <button className="btn btn-primary" onClick={() => navigate("/")}>🏠 Back to Home</button>
        </div>
      </div>
      <div className="footer">AI-Powered Job Application System | Sol Plaatje University | NPRJ740 — 2026</div>
    </>
  );
}
