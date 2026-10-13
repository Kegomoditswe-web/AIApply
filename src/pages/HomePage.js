// src/pages/HomePage.js

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function HomePage() {
  const { currentUser } = useAuth();

  const [recentResults, setRecentResults] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    avgScore: 0,
    coverLetters: 0,
    latestScore: null,
    previousScore: null,
    scoreChange: null,
  });

  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get first name from Firebase Authentication displayName
  const firstName =
    currentUser?.displayName?.trim()?.split(" ")[0] || "User";

  // A user is considered new until they complete
  // their first CV analysis.
  const isNewUser = !loading && stats.total === 0;

  // ─────────────────────────────────────────────
  // TIMESTAMP HELPER
  // ─────────────────────────────────────────────

  function getTimestampValue(timestamp) {
    if (!timestamp) return 0;

    try {
      if (typeof timestamp.toMillis === "function") {
        return timestamp.toMillis();
      }

      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().getTime();
      }

      const parsedDate = new Date(timestamp).getTime();

      return Number.isNaN(parsedDate) ? 0 : parsedDate;
    } catch {
      return 0;
    }
  }

  // ─────────────────────────────────────────────
  // FETCH DASHBOARD DATA
  // ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // ─────────────────────────────────────────
        // GET ALL ATS RESULTS FOR STATISTICS
        // ─────────────────────────────────────────

        const allResultsQuery = query(
          collection(db, "atsResults"),
          where("userID", "==", currentUser.uid)
        );

        const allResultsSnap = await getDocs(allResultsQuery);

        const allResults = allResultsSnap.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        const total = allResults.length;

        // Calculate average ATS score
        const avgScore =
          total > 0
            ? Math.round(
                allResults.reduce(
                  (sum, result) =>
                    sum + Number(result.atsScore || 0),
                  0
                ) / total
              )
            : 0;

        // ─────────────────────────────────────────
        // SORT RESULTS BY ANALYSIS DATE
        // ─────────────────────────────────────────

        const sortedResults = [...allResults].sort(
          (a, b) =>
            getTimestampValue(b.analysisDate) -
            getTimestampValue(a.analysisDate)
        );

        // ─────────────────────────────────────────
        // GET LATEST 5 ANALYSES
        // ─────────────────────────────────────────

        const recent = sortedResults.slice(0, 5);

        setRecentResults(recent);

        // ─────────────────────────────────────────
        // ATS SCORE PROGRESS
        // ─────────────────────────────────────────

        const latestScore =
          sortedResults.length > 0
            ? Number(sortedResults[0].atsScore || 0)
            : null;

        const previousScore =
          sortedResults.length > 1
            ? Number(sortedResults[1].atsScore || 0)
            : null;

        const scoreChange =
          latestScore !== null && previousScore !== null
            ? latestScore - previousScore
            : null;

        // Last five analyses displayed
        // oldest -> newest for the chart
        const history = sortedResults
          .slice(0, 5)
          .reverse()
          .map((result) => ({
            id: result.id,
            score: Number(result.atsScore || 0),
            jobTitle:
              result.jobTitle || "Untitled Position",
            companyName:
              result.companyName || "Company not specified",
            analysisDate: result.analysisDate,
          }));

        setScoreHistory(history);

        // ─────────────────────────────────────────
        // COUNT COVER LETTERS
        // ─────────────────────────────────────────

        const coverLetterQuery = query(
          collection(db, "coverLetters"),
          where("userID", "==", currentUser.uid)
        );

        const coverLetterSnap = await getDocs(
          coverLetterQuery
        );

        // ─────────────────────────────────────────
        // SET STATISTICS
        // ─────────────────────────────────────────

        setStats({
          total,
          avgScore,
          coverLetters: coverLetterSnap.size,
          latestScore,
          previousScore,
          scoreChange,
        });
      } catch (err) {
        console.error(
          "Error fetching dashboard data:",
          err
        );

        setRecentResults([]);
        setScoreHistory([]);

        setStats({
          total: 0,
          avgScore: 0,
          coverLetters: 0,
          latestScore: null,
          previousScore: null,
          scoreChange: null,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  // ─────────────────────────────────────────────
  // SCORE BADGE
  // ─────────────────────────────────────────────

  function scoreBadge(score) {
    const numericScore = Number(score || 0);

    if (numericScore >= 75) {
      return "dashboard-score score-high";
    }

    if (numericScore >= 50) {
      return "dashboard-score score-medium";
    }

    return "dashboard-score score-low";
  }

  // ─────────────────────────────────────────────
  // FORMAT DATE
  // ─────────────────────────────────────────────

  function formatDate(timestamp) {
    if (!timestamp) return "—";

    try {
      const date = timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

      return date.toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  // ─────────────────────────────────────────────
  // LATEST ANALYSIS
  // ─────────────────────────────────────────────

  const latestAnalysis =
    scoreHistory.length > 0
      ? scoreHistory[scoreHistory.length - 1]
      : null;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <>
      <Navbar />

      <main className="dashboard-page">

        {/* ==========================================
            HERO
        ========================================== */}

        <section className="dashboard-hero">

          <div className="dashboard-hero-content">

            <span className="dashboard-eyebrow">
              AI-POWERED JOB APPLICATION ASSISTANT
            </span>

            {/* Dynamic greeting */}

            <h1>
              {loading
                ? `Welcome, ${firstName}.`
                : isNewUser
                ? `Welcome to AIApply, ${firstName}.`
                : `Welcome back, ${firstName}.`}
            </h1>

            {/* Dynamic description */}

            <p>
              {loading
                ? "Preparing your job application dashboard..."
                : isNewUser
                ? "Start by analysing your first CV against a job description. AIApply will help you identify important keywords, measure ATS compatibility and improve your application."
                : "Continue improving your applications with ATS analysis, keyword insights and tailored recommendations."}
            </p>

            {/* Dynamic buttons */}

            <div className="dashboard-hero-actions">

              <Link
                to="/analyse"
                className="dashboard-primary-action"
              >
                <span className="action-plus">+</span>

                {isNewUser
                  ? "Analyse Your First CV"
                  : "Analyse New CV"}
              </Link>

              {/* Only existing users have recent analyses */}

              {!loading && !isNewUser && (
                <a
                  href="#recent-analyses"
                  className="dashboard-secondary-action"
                >
                  View Recent Analyses
                </a>
              )}

            </div>

          </div>

          {/* HERO VISUAL */}

          <div className="dashboard-hero-visual">

            <div className="hero-score-card">

              <div className="hero-score-header">

                <span>ATS Analysis</span>

                <span className="hero-status-dot">
                  Ready
                </span>

              </div>

              <div className="hero-score-body">

                <div className="hero-score-circle">
                  <span>AI</span>
                </div>

                <div>

                  <strong>
                    {isNewUser
                      ? "Start your first analysis."
                      : "Match smarter."}
                  </strong>

                  <p>
                    {isNewUser
                      ? "Upload your CV and compare it with your target role."
                      : "Compare your CV with the role before applying."}
                  </p>

                </div>

              </div>

              <div className="hero-mini-bars">

                <div>
                  <span>Keywords</span>

                  <div>
                    <i className="bar-one" />
                  </div>
                </div>

                <div>
                  <span>Skills</span>

                  <div>
                    <i className="bar-two" />
                  </div>
                </div>

                <div>
                  <span>Experience</span>

                  <div>
                    <i className="bar-three" />
                  </div>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ==========================================
            STATISTICS
        ========================================== */}

        <section className="dashboard-stats">

          {/* CV ANALYSES */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon stat-blue">
              CV
            </div>

            <div className="dashboard-stat-content">

              <span className="dashboard-stat-label">
                CVs Analysed
              </span>

              <strong>
                {loading ? "—" : stats.total}
              </strong>

              <small>
                {isNewUser
                  ? "Start your first analysis"
                  : "Total application analyses"}
              </small>

            </div>

          </div>

          {/* AVERAGE ATS SCORE */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon stat-green">
              %
            </div>

            <div className="dashboard-stat-content">

              <span className="dashboard-stat-label">
                Average ATS Score
              </span>

              <strong>
                {loading
                  ? "—"
                  : `${stats.avgScore}%`}
              </strong>

              <small>
                {isNewUser
                  ? "Your score will appear here"
                  : "Across all analysed CVs"}
              </small>

            </div>

          </div>

          {/* COVER LETTERS */}

          <div className="dashboard-stat-card">

            <div className="dashboard-stat-icon stat-orange">
              CL
            </div>

            <div className="dashboard-stat-content">

              <span className="dashboard-stat-label">
                Cover Letters
              </span>

              <strong>
                {loading
                  ? "—"
                  : stats.coverLetters}
              </strong>

              <small>
                {stats.coverLetters === 0
                  ? "No cover letters generated yet"
                  : "Generated cover letters"}
              </small>

            </div>

          </div>

        </section>

        {/* ==========================================
            ATS SCORE PROGRESS
        ========================================== */}

        {!loading && stats.total > 0 && (

          <section className="dashboard-progress-card">

            <div className="dashboard-progress-heading">

              <div>

                <span className="dashboard-section-label">
                  PERFORMANCE
                </span>

                <h2>
                  ATS Score Progress
                </h2>

                <p>
                  Track your ATS compatibility across your
                  recent applications.
                </p>

              </div>

              <Link
                to="/history"
                className="dashboard-progress-history-link"
              >
                View full history →
              </Link>

            </div>

            <div className="dashboard-progress-content">

              {/* ======================================
                  SCORE SUMMARY
              ====================================== */}

              <div className="progress-summary">

                {/* LATEST SCORE */}

                <div className="progress-summary-item">

                  <span>
                    Latest Score
                  </span>

                  <strong>
                    {stats.latestScore !== null
                      ? `${stats.latestScore}%`
                      : "—"}
                  </strong>

                  {latestAnalysis && (
                    <div className="progress-latest-job">

                      <b>
                        {latestAnalysis.companyName}
                      </b>

                      <span>
                        {latestAnalysis.jobTitle}
                      </span>

                      <small>
                        {formatDate(
                          latestAnalysis.analysisDate
                        )}
                      </small>

                    </div>
                  )}

                </div>

                <div className="progress-summary-divider" />

                {/* LATEST SCORE CHANGE */}

                <div className="progress-summary-item">

                  <span>
                    Latest Score Change
                  </span>

                  <strong
                    className={
                      stats.scoreChange === null
                        ? ""
                        : stats.scoreChange > 0
                        ? "progress-positive"
                        : stats.scoreChange < 0
                        ? "progress-negative"
                        : "progress-neutral"
                    }
                  >

                    {stats.scoreChange === null
                      ? "—"
                      : stats.scoreChange > 0
                      ? `+${stats.scoreChange}%`
                      : stats.scoreChange < 0
                      ? `${stats.scoreChange}%`
                      : "0%"}

                  </strong>

                  <small>
                    {stats.total < 2
                      ? "Complete another analysis to compare"
                      : stats.scoreChange > 0
                      ? "Higher than your previous analysis"
                      : stats.scoreChange < 0
                      ? "Lower than your previous analysis"
                      : "Same as your previous analysis"}
                  </small>

                </div>

              </div>

              {/* ======================================
                  SCORE HISTORY CHART
              ====================================== */}

              <div className="progress-chart-area">

                <div className="progress-chart-header">

                  <div>

                    <strong>
                      Recent Score History
                    </strong>

                    <span>
                      Last {scoreHistory.length}{" "}
                      {scoreHistory.length === 1
                        ? "analysis"
                        : "analyses"}
                    </span>

                  </div>

                </div>

                <div className="ats-progress-chart">

                  {scoreHistory.map((item) => (

                    <div
                      className="ats-progress-column"
                      key={item.id}
                    >

                      <span className="ats-progress-value">
                        {item.score}%
                      </span>

                      <div className="ats-progress-track">

                        <div
                          className="ats-progress-bar"
                          style={{
                            height: `${Math.max(
                              6,
                              Math.min(100, item.score)
                            )}%`,
                          }}
                          title={`${item.companyName} - ${item.jobTitle} - ${item.score}%`}
                        />

                      </div>

                      <span className="ats-progress-date">
                        {formatDate(item.analysisDate)}
                      </span>

                    </div>

                  ))}

                </div>

                {scoreHistory.length === 1 && (

                  <p className="progress-chart-note">
                    Your score history will become more useful
                    as you complete more analyses.
                  </p>

                )}

                {scoreHistory.length > 1 && (

                  <p className="progress-chart-note">
                    ATS scores can vary because each job
                    description may contain different skills
                    and keywords.
                  </p>

                )}

              </div>

            </div>

          </section>

        )}

        {/* ==========================================
            MAIN DASHBOARD CONTENT
        ========================================== */}

        <section className="dashboard-content-grid">

          {/* ==========================================
              START NEW ANALYSIS
          ========================================== */}

          <div className="dashboard-action-card">

            <div className="dashboard-card-heading">

              <div>

                <span className="dashboard-section-label">
                  {isNewUser
                    ? "GET STARTED"
                    : "NEW APPLICATION"}
                </span>

                <h2>
                  {isNewUser
                    ? "Analyse your first CV"
                    : "Start a new analysis"}
                </h2>

              </div>

            </div>

            <p className="dashboard-action-description">

              {isNewUser
                ? "Getting started is simple. Upload your CV and provide the job description for the position you want to apply for."
                : "Upload your CV and provide the job description you're applying for. AIApply will compare the two and generate your ATS compatibility results."}

            </p>

            <div className="analysis-preview">

              {/* STEP 1 */}

              <div className="analysis-preview-item">

                <div className="preview-number">
                  1
                </div>

                <div>

                  <strong>
                    Upload your CV
                  </strong>

                  <p>
                    PDF or TXT document
                  </p>

                </div>

              </div>

              <div className="analysis-preview-line" />

              {/* STEP 2 */}

              <div className="analysis-preview-item">

                <div className="preview-number">
                  2
                </div>

                <div>

                  <strong>
                    Add job details
                  </strong>

                  <p>
                    Paste the job description
                  </p>

                </div>

              </div>

              <div className="analysis-preview-line" />

              {/* STEP 3 */}

              <div className="analysis-preview-item">

                <div className="preview-number">
                  3
                </div>

                <div>

                  <strong>
                    Get your results
                  </strong>

                  <p>
                    Score, keywords and suggestions
                  </p>

                </div>

              </div>

            </div>

            <Link
              to="/analyse"
              className="btn btn-primary btn-full dashboard-analysis-btn"
            >

              {isNewUser
                ? "Analyse Your First CV"
                : "Start CV Analysis"}

              <span>→</span>

            </Link>

          </div>

          {/* ==========================================
              RECENT ANALYSES
          ========================================== */}

          <div
            className="dashboard-recent-card"
            id="recent-analyses"
          >

            <div className="dashboard-card-heading">

              <div>

                <span className="dashboard-section-label">
                  ACTIVITY
                </span>

                <h2>
                  Recent analyses
                </h2>

              </div>

              {!loading && recentResults.length > 0 && (

                <span className="recent-count">
                  Latest {recentResults.length}
                </span>

              )}

            </div>

            {/* LOADING */}

            {loading ? (

              <div className="dashboard-loading">

                <div className="dashboard-loader" />

                <p>
                  Loading your analyses...
                </p>

              </div>

            ) : recentResults.length === 0 ? (

              /* EMPTY STATE */

              <div className="dashboard-empty-state">

                <div className="empty-state-icon">
                  CV
                </div>

                <h3>
                  Your journey starts here
                </h3>

                <p>
                  Complete your first CV analysis and your
                  application history will appear here.
                </p>

                <Link
                  to="/analyse"
                  className="empty-state-link"
                >
                  Analyse your first CV →
                </Link>

              </div>

            ) : (

              /* RESULTS */

              <div className="recent-analysis-list">

                {recentResults.map((result) => (

                  <Link
                    to={`/results/${result.id}`}
                    className="recent-analysis-item"
                    key={result.id}
                  >

                    <div className="recent-analysis-main">

                      <div className="recent-job-icon">

                        {(result.jobTitle || "J")
                          .charAt(0)
                          .toUpperCase()}

                      </div>

                      <div className="recent-job-details">

                        <strong>

                          {result.jobTitle ||
                            "Untitled Position"}

                        </strong>

                        <span>

                          {result.companyName ||
                            "Company not specified"}

                        </span>

                      </div>

                    </div>

                    <div className="recent-analysis-meta">

                      <span
                        className={scoreBadge(
                          result.atsScore
                        )}
                      >

                        {Number(
                          result.atsScore || 0
                        )}
                        %

                      </span>

                      <span className="recent-date">

                        {formatDate(
                          result.analysisDate
                        )}

                      </span>

                      <span className="recent-arrow">
                        →
                      </span>

                    </div>

                  </Link>

                ))}

              </div>

            )}

          </div>

        </section>

        {/* ==========================================
            HOW IT WORKS
        ========================================== */}

        <section className="dashboard-workflow">

          <div className="dashboard-workflow-heading">

            <span className="dashboard-section-label">

              {isNewUser
                ? "GETTING STARTED"
                : "SIMPLE WORKFLOW"}

            </span>

            <h2>

              {isNewUser
                ? "How to create your first analysis"
                : "From CV to stronger application"}

            </h2>

            <p>

              {isNewUser
                ? "Follow these four steps to get your first ATS compatibility result."
                : "AIApply guides you through four simple steps."}

            </p>

          </div>

          <div className="workflow-grid">

            {/* STEP 01 */}

            <div className="workflow-step">

              <div className="workflow-number">
                01
              </div>

              <div className="workflow-icon">
                ↑
              </div>

              <h3>
                Upload CV
              </h3>

              <p>
                Upload your current CV in a supported
                document format.
              </p>

            </div>

            {/* STEP 02 */}

            <div className="workflow-step">

              <div className="workflow-number">
                02
              </div>

              <div className="workflow-icon">
                ≡
              </div>

              <h3>
                Add Job Description
              </h3>

              <p>
                Paste the requirements from the position
                you're applying for.
              </p>

            </div>

            {/* STEP 03 */}

            <div className="workflow-step">

              <div className="workflow-number">
                03
              </div>

              <div className="workflow-icon">
                AI
              </div>

              <h3>
                Analyse
              </h3>

              <p>
                AIApply compares your CV with the job's
                skills and keywords.
              </p>

            </div>

            {/* STEP 04 */}

            <div className="workflow-step">

              <div className="workflow-number">
                04
              </div>

              <div className="workflow-icon">
                ✓
              </div>

              <h3>
                Improve
              </h3>

              <p>
                Review your ATS score, missing keywords
                and improvement suggestions.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* ==========================================
          FOOTER
      ========================================== */}

      <footer className="footer">
        AI-Powered Job Application System | Sol Plaatje
        University | NPRJ740 — 2026
      </footer>

    </>
  );
}