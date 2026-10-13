// src/pages/AnalysePage.js
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { validateAnalysisForm } from "../utils/validation";

export default function AnalysePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setCvFile(file);
    // Read text content for plain text files
    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => setCvText(e.target.result);
      reader.readAsText(file);
    } else {
      // For PDF, we pass a placeholder — Cloud Function handles extraction
      setCvText("PDF_UPLOADED");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1
  });

  async function handleAnalyse() {
    const validationError = validateAnalysisForm({
      cvFile,
      jobTitle,
      jobDescription,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);
    setStep(2);

    try {
      // 1. Upload CV file to Firebase Storage
      const storageRef = ref(storage, `cvs/${currentUser.uid}/${Date.now()}_${cvFile.name}`);
      await uploadBytes(storageRef, cvFile);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save CV record to Firestore
      const cvDoc = await addDoc(collection(db, "cvs"), {
        userID: currentUser.uid,
        fileName: cvFile.name,
        fileType: cvFile.type === "application/pdf" ? "PDF" : "TXT",
        filePath: downloadURL,
        extractedText: cvText,
        uploadDate: serverTimestamp(),
        fileSize: Math.round(cvFile.size / 1024)
      });

      // 3. Save Job Description to Firestore
      const jobDoc = await addDoc(collection(db, "jobDescriptions"), {
        userID: currentUser.uid,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        descriptionText: jobDescription.trim(),
        submittedDate: serverTimestamp()
      });

      // 4. Call Cloud Function to run AI/NLP analysis
      const analyseCV = httpsCallable(functions, "analyseCV");
      const result = await analyseCV({
        cvText,
        jobDescription: jobDescription.trim(),
        cvID: cvDoc.id,
        jobID: jobDoc.id,
        userID: currentUser.uid,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim()
      });

      // 5. Navigate to results page with the result ID
      navigate(`/results/${result.data.resultID}`);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please check your internet connection and try again.");
      setLoading(false);
      setStep(1);
    }
  }

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="page-title">New CV Analysis</div>
        <div className="page-sub">Upload your CV and paste the job description to get started</div>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? "step-active" : "step-inactive"}`}>
            <div className="step-num">1</div>
            <div className="step-label">Upload &amp; Input</div>
          </div>
          <div className={`step-line ${step >= 2 ? "step-line-done" : ""}`} />
          <div className={`step ${step >= 2 ? "step-active" : "step-inactive"}`}>
            <div className="step-num">2</div>
            <div className="step-label">AI Processing</div>
          </div>
          <div className={`step-line ${step >= 3 ? "step-line-done" : ""}`} />
          <div className={`step ${step >= 3 ? "step-active" : "step-inactive"}`}>
            <div className="step-num">3</div>
            <div className="step-label">View Results</div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1a365d", marginBottom: 8 }}>Analysing your CV...</div>
            <p style={{ color: "#718096", fontSize: 14 }}>Our AI is extracting keywords and calculating your ATS score. This takes a few seconds.</p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#1a365d", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          </div>
        ) : (
          <div className="grid2">
            {/* CV Upload */}
            <div className="card">
              <div className="card-title">📄 Upload CV Document</div>
              <div {...getRootProps()} className={`upload-box ${isDragActive ? "dragging" : ""}`}>
                <input {...getInputProps()} />
                <div className="upload-icon">📄</div>
                <div className="upload-text">{isDragActive ? "Drop your CV here..." : "Click to upload or drag & drop"}</div>
                <div className="upload-sub">Supports PDF and .txt files</div>
                <div style={{ marginTop: 16 }}>
                  <span className="btn btn-primary" style={{ fontSize: 13, padding: "8px 16px" }}>Browse Files</span>
                </div>
              </div>

              {cvFile && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fff4", borderRadius: 8, border: "1px solid #c6f6d5", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#276749" }}>{cvFile.name}</div>
                    <div style={{ fontSize: 12, color: "#718096" }}>{Math.round(cvFile.size / 1024)} KB — uploaded successfully</div>
                  </div>
                  <button onClick={() => setCvFile(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#c53030", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
              )}
            </div>

            {/* Job description */}
            <div className="card">
              <div className="card-title">📋 Job Description</div>
              <div className="form-row">
                <label>Job Title *</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Developer" />
              </div>
              <div className="form-row">
                <label>Company Name (optional)</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. TechCorp South Africa" />
              </div>
              <div className="form-row">
                <label>Paste Job Description *</label>
                <textarea
                  rows={8}
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  style={{ resize: "vertical" }}
                />
                <div style={{ fontSize: 12, color: "#a0aec0", marginTop: 4 }}>{jobDescription.length} characters</div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="error-msg" style={{ marginBottom: 12 }}>⚠ {error}</p>}

        {!loading && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => navigate("/")}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAnalyse}>Analyse CV →</button>
          </div>
        )}
      </div>
      <div className="footer">AI-Powered Job Application System | Sol Plaatje University | NPRJ740 — 2026</div>
    </>
  );
}
