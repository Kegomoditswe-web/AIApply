// src/pages/SuggestionsPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import Navbar from "../components/Navbar";

export default function SuggestionsPage() {
  const { resultID } = useParams();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!resultID) {
        setLoading(false);
        return;
      }

      try {
        const resultSnap = await getDoc(doc(db, "atsResults", resultID));
        if (resultSnap.exists()) {
          setResult({ id: resultSnap.id, ...resultSnap.data() });
        }

        const q = query(collection(db, "suggestions"), where("resultID", "==", resultID));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        items.sort((a, b) => (order[a.priorityLevel] ?? 3) - (order[b.priorityLevel] ?? 3));
        setSuggestions(items);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [resultID]);

  const priorityConfig = {
    HIGH:   { label: "⚠ High Priority",   border: "#e53e3e", titleColor: "#c53030", bg: "#fff5f5" },
    MEDIUM: { label: "📝 Medium Priority", border: "#e6a817", titleColor: "#c05621", bg: "#fffbeb" },
    LOW:    { label: "✅ Low Priority",    border: "#276749", titleColor: "#276749", bg: "#f0fff4" },
  };

  const grouped = { HIGH: [], MEDIUM: [], LOW: [] };
  suggestions.forEach(s => { if (grouped[s.priorityLevel]) grouped[s.priorityLevel].push(s); });

  if (loading) return <><Navbar /><div className="main"><p style={{ color: "#718096" }}>Loading suggestions...</p></div></>;

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="page-title">Improvement Suggestions</div>
        <div className="page-sub">
          AI-generated recommendations for: {result?.jobTitle || "your analysis"}
          {result?.atsScore && <span style={{ marginLeft: 8 }} className="badge badge-orange">Current Score: {result.atsScore}%</span>}
        </div>

        {suggestions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: "#276749" }}>Excellent! No major suggestions.</div>
            <p style={{ color: "#718096", fontSize: 14, marginTop: 8 }}>Your CV is well-optimised for this job description.</p>
          </div>
        ) : (
          ["HIGH", "MEDIUM", "LOW"].map(level => {
            const items = grouped[level];
            if (items.length === 0) return null;
            const cfg = priorityConfig[level];
            return (
              <div key={level} className="card" style={{ borderLeft: `4px solid ${cfg.border}`, background: cfg.bg }}>
                <div className="card-title" style={{ color: cfg.titleColor, borderBottomColor: cfg.border + "44" }}>{cfg.label}</div>

                {level === "HIGH" ? (
                  /* Table for high priority keyword suggestions */
                  <table>
                    <thead>
                      <tr><th>Missing Keyword</th><th>Recommended Action</th><th>Impact</th></tr>
                    </thead>
                    <tbody>
                      {items.map(s => (
                        <tr key={s.id}>
                          <td><span className="chip chip-missing">{s.affectedKeyword || s.category}</span></td>
                          <td style={{ fontSize: 13 }}>{s.suggestionText}</td>
                          <td><span className={`badge badge-${s.impactRating === "HIGH" ? "red" : "orange"}`}>{s.impactRating}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* Bullet list for medium/low priority */
                  <ul style={{ paddingLeft: 20, fontSize: 14, color: "#4a5568", lineHeight: 2 }}>
                    {items.map(s => <li key={s.id}>{s.suggestionText}</li>)}
                  </ul>
                )}
              </div>
            );
          })
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/results/${resultID}`)}>← Back to Results</button>
          <Link to={`/cover-letter/${resultID}`} className="btn btn-success">Generate Cover Letter →</Link>
        </div>
      </div>
      <div className="footer">AI-Powered Job Application System | Sol Plaatje University | NPRJ740 — 2026</div>
    </>
  );
}
