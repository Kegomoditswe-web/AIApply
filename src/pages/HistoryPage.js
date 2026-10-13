// src/pages/HistoryPage.js

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function HistoryPage() {
  const { currentUser } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / filters
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status update
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // ─────────────────────────────────────────────
  // FETCH HISTORY
  // ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchHistory() {
      if (!currentUser?.uid) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const historyQuery = query(
          collection(db, "atsResults"),
          where("userID", "==", currentUser.uid)
        );

        const snapshot = await getDocs(historyQuery);

        const historyResults = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setResults(historyResults);
      } catch (err) {
        console.error("Error fetching history:", err);

        setError(
          "We could not load your analysis history. Please try again."
        );

        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [currentUser]);

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function getTimestampValue(timestamp) {
    if (!timestamp) return 0;

    try {
      if (timestamp.toMillis) {
        return timestamp.toMillis();
      }

      if (timestamp.toDate) {
        return timestamp.toDate().getTime();
      }

      return new Date(timestamp).getTime() || 0;
    } catch {
      return 0;
    }
  }

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

  function scoreBadgeClass(score) {
    const numericScore = safeNumber(score);

    if (numericScore >= 75) {
      return "dashboard-score score-high";
    }

    if (numericScore >= 50) {
      return "dashboard-score score-medium";
    }

    return "dashboard-score score-low";
  }

  function getStatus(result) {
    return result.applicationStatus || "Not Applied";
  }

  function statusClass(status) {
    switch (status) {
      case "Applied":
        return "history-status history-status-applied";

      case "Interview":
        return "history-status history-status-interview";

      case "Offer":
        return "history-status history-status-offer";

      case "Rejected":
        return "history-status history-status-rejected";

      default:
        return "history-status history-status-not-applied";
    }
  }

  // ─────────────────────────────────────────────
  // UPDATE APPLICATION STATUS
  // ─────────────────────────────────────────────

  async function handleStatusChange(resultId, newStatus) {
    try {
      setUpdatingStatusId(resultId);
      setError("");

      const resultRef = doc(db, "atsResults", resultId);

      await updateDoc(resultRef, {
        applicationStatus: newStatus,
      });

      setResults((previousResults) =>
        previousResults.map((result) =>
          result.id === resultId
            ? {
                ...result,
                applicationStatus: newStatus,
              }
            : result
        )
      );
    } catch (err) {
      console.error("Error updating application status:", err);

      setError(
        "Application status could not be updated. Please try again."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  // ─────────────────────────────────────────────
  // DELETE ANALYSIS
  // ─────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");

      await deleteDoc(
        doc(db, "atsResults", deleteTarget.id)
      );

      setResults((previousResults) =>
        previousResults.filter(
          (result) => result.id !== deleteTarget.id
        )
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting analysis:", err);

      setError(
        "The analysis could not be deleted. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ─────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────

  const totalAnalyses = results.length;

  const averageScore =
    totalAnalyses > 0
      ? Math.round(
          results.reduce(
            (total, result) =>
              total + safeNumber(result.atsScore),
            0
          ) / totalAnalyses
        )
      : 0;

  const highestScore =
    totalAnalyses > 0
      ? Math.max(
          ...results.map((result) =>
            safeNumber(result.atsScore)
          )
        )
      : 0;

  const appliedCount = results.filter((result) => {
    const status = getStatus(result);

    return [
      "Applied",
      "Interview",
      "Offer",
      "Rejected",
    ].includes(status);
  }).length;

  // ─────────────────────────────────────────────
  // SEARCH + FILTER + SORT
  // ─────────────────────────────────────────────

  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // SEARCH
    const search = searchTerm.trim().toLowerCase();

    if (search) {
      filtered = filtered.filter((result) => {
        const jobTitle = String(
          result.jobTitle || ""
        ).toLowerCase();

        const companyName = String(
          result.companyName || ""
        ).toLowerCase();

        return (
          jobTitle.includes(search) ||
          companyName.includes(search)
        );
      });
    }

    // SCORE FILTER
    if (scoreFilter === "high") {
      filtered = filtered.filter(
        (result) => safeNumber(result.atsScore) >= 75
      );
    }

    if (scoreFilter === "medium") {
      filtered = filtered.filter((result) => {
        const score = safeNumber(result.atsScore);

        return score >= 50 && score < 75;
      });
    }

    if (scoreFilter === "low") {
      filtered = filtered.filter(
        (result) => safeNumber(result.atsScore) < 50
      );
    }

    // STATUS FILTER
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (result) =>
          getStatus(result) === statusFilter
      );
    }

    // SORT
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "oldest":
          return (
            getTimestampValue(a.analysisDate) -
            getTimestampValue(b.analysisDate)
          );

        case "highest":
          return (
            safeNumber(b.atsScore) -
            safeNumber(a.atsScore)
          );

        case "lowest":
          return (
            safeNumber(a.atsScore) -
            safeNumber(b.atsScore)
          );

        case "newest":
        default:
          return (
            getTimestampValue(b.analysisDate) -
            getTimestampValue(a.analysisDate)
          );
      }
    });

    return filtered;
  }, [
    results,
    searchTerm,
    scoreFilter,
    statusFilter,
    sortOption,
  ]);

  // ─────────────────────────────────────────────
  // CLEAR FILTERS
  // ─────────────────────────────────────────────

  function clearFilters() {
    setSearchTerm("");
    setScoreFilter("all");
    setStatusFilter("all");
    setSortOption("newest");
  }

  const filtersActive =
    searchTerm !== "" ||
    scoreFilter !== "all" ||
    statusFilter !== "all" ||
    sortOption !== "newest";

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <>
      <Navbar />

      <main className="history-page">

        {/* ==========================================
            HEADER
        ========================================== */}

        <section className="history-header">

          <div>
            <span className="history-eyebrow">
              APPLICATION ACTIVITY
            </span>

            <h1>Analysis History</h1>

            <p>
              Review your previous CV analyses, track
              applications and monitor your ATS scores.
            </p>
          </div>

          <Link
            to="/analyse"
            className="btn btn-primary"
          >
            + New Analysis
          </Link>

        </section>

        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <div className="history-error">
            <span>!</span>

            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {/* ==========================================
            STATISTICS
        ========================================== */}

        {!loading && results.length > 0 && (
          <section className="history-stats">

            <div className="history-stat-card">
              <div className="history-stat-icon">
                CV
              </div>

              <div>
                <span>Total Analyses</span>
                <strong>{totalAnalyses}</strong>
                <small>
                  CV and job comparisons
                </small>
              </div>
            </div>

            <div className="history-stat-card">
              <div className="history-stat-icon">
                %
              </div>

              <div>
                <span>Average Score</span>
                <strong>{averageScore}%</strong>
                <small>
                  Across all analyses
                </small>
              </div>
            </div>

            <div className="history-stat-card">
              <div className="history-stat-icon">
                ↑
              </div>

              <div>
                <span>Highest Score</span>
                <strong>{highestScore}%</strong>
                <small>
                  Your best ATS match
                </small>
              </div>
            </div>

            <div className="history-stat-card">
              <div className="history-stat-icon">
                ✓
              </div>

              <div>
                <span>Applications Tracked</span>
                <strong>{appliedCount}</strong>
                <small>
                  Marked as applied or beyond
                </small>
              </div>
            </div>

          </section>
        )}

        {/* ==========================================
            MAIN HISTORY CARD
        ========================================== */}

        <section className="history-card">

          <div className="history-card-header">

            <div>
              <span className="history-section-label">
                YOUR ANALYSES
              </span>

              <h2>Previous Applications</h2>

              {!loading && (
                <p>
                  Showing {filteredResults.length} of{" "}
                  {results.length} analyses
                </p>
              )}
            </div>

          </div>

          {/* ==========================================
              SEARCH AND FILTERS
          ========================================== */}

          {!loading && results.length > 0 && (
            <div className="history-toolbar">

              <div className="history-search">
                <span className="history-search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search job title or company..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />
              </div>

              <select
                value={scoreFilter}
                onChange={(event) =>
                  setScoreFilter(event.target.value)
                }
                className="history-select"
              >
                <option value="all">
                  All Scores
                </option>

                <option value="high">
                  75% and above
                </option>

                <option value="medium">
                  50% – 74%
                </option>

                <option value="low">
                  Below 50%
                </option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="history-select"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="Not Applied">
                  Not Applied
                </option>

                <option value="Applied">
                  Applied
                </option>

                <option value="Interview">
                  Interview
                </option>

                <option value="Offer">
                  Offer
                </option>

                <option value="Rejected">
                  Rejected
                </option>
              </select>

              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value)
                }
                className="history-select"
              >
                <option value="newest">
                  Newest First
                </option>

                <option value="oldest">
                  Oldest First
                </option>

                <option value="highest">
                  Highest Score
                </option>

                <option value="lowest">
                  Lowest Score
                </option>
              </select>

              {filtersActive && (
                <button
                  type="button"
                  className="history-clear-btn"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              )}

            </div>
          )}

          {/* ==========================================
              LOADING
          ========================================== */}

          {loading ? (

            <div className="history-loading">
              <div className="dashboard-loader" />

              <p>
                Loading your analysis history...
              </p>
            </div>

          ) : results.length === 0 ? (

            /* ========================================
               NO HISTORY
            ======================================== */

            <div className="history-empty">

              <div className="history-empty-icon">
                CV
              </div>

              <h3>No analyses yet</h3>

              <p>
                Analyse your first CV and your
                application history will appear here.
              </p>

              <Link
                to="/analyse"
                className="btn btn-primary"
              >
                Analyse Your First CV
              </Link>

            </div>

          ) : filteredResults.length === 0 ? (

            /* ========================================
               NO FILTER RESULTS
            ======================================== */

            <div className="history-empty">

              <div className="history-empty-icon">
                ?
              </div>

              <h3>No matching analyses</h3>

              <p>
                No applications match your current
                search or filters.
              </p>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                Clear Filters
              </button>

            </div>

          ) : (

            /* ========================================
               HISTORY TABLE
            ======================================== */

            <div className="history-table-wrapper">

              <table className="history-table">

                <thead>
                  <tr>
                    <th>Job</th>
                    <th>ATS Score</th>
                    <th>Status</th>
                    <th>Keywords</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredResults.map((result) => {

                    const currentStatus =
                      getStatus(result);

                    return (
                      <tr key={result.id}>

                        {/* JOB */}

                        <td>
                          <div className="history-job">

                            <div className="history-job-icon">
                              {(result.jobTitle || "J")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <Link
                                to={`/results/${result.id}`}
                                className="history-job-title"
                              >
                                {result.jobTitle ||
                                  "Untitled Position"}
                              </Link>

                              <span>
                                {result.companyName ||
                                  "Company not specified"}
                              </span>
                            </div>

                          </div>
                        </td>

                        {/* SCORE */}

                        <td>
                          <span
                            className={scoreBadgeClass(
                              result.atsScore
                            )}
                          >
                            {safeNumber(
                              result.atsScore
                            )}
                            %
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <div className="history-status-wrapper">

                            <span
                              className={statusClass(
                                currentStatus
                              )}
                            >
                              {currentStatus}
                            </span>

                            <select
                              className="history-status-select"
                              value={currentStatus}
                              disabled={
                                updatingStatusId ===
                                result.id
                              }
                              onChange={(event) =>
                                handleStatusChange(
                                  result.id,
                                  event.target.value
                                )
                              }
                            >
                              <option value="Not Applied">
                                Not Applied
                              </option>

                              <option value="Applied">
                                Applied
                              </option>

                              <option value="Interview">
                                Interview
                              </option>

                              <option value="Offer">
                                Offer
                              </option>

                              <option value="Rejected">
                                Rejected
                              </option>
                            </select>

                          </div>
                        </td>

                        {/* KEYWORDS */}

                        <td>
                          <div className="history-keywords">

                            <span className="history-matched">
                              {safeNumber(
                                result.keywordsMatched
                              )}{" "}
                              matched
                            </span>

                            <span className="history-missing">
                              {safeNumber(
                                result.keywordsMissing
                              )}{" "}
                              missing
                            </span>

                          </div>
                        </td>

                        {/* DATE */}

                        <td>
                          <span className="history-date">
                            {formatDate(
                              result.analysisDate
                            )}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="history-actions">

                            <Link
                              to={`/results/${result.id}`}
                              className="history-action-link"
                            >
                              Results
                            </Link>

                            <Link
                              to={`/suggestions/${result.id}`}
                              className="history-action-link"
                            >
                              Suggestions
                            </Link>

                            <Link
                              to={`/cover-letter/${result.id}`}
                              className="history-action-link history-letter-link"
                            >
                              Letter
                            </Link>

                            <button
                              type="button"
                              className="history-delete-btn"
                              onClick={() =>
                                setDeleteTarget(result)
                              }
                            >
                              Delete
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

      {/* ==========================================
          DELETE CONFIRMATION MODAL
      ========================================== */}

      {deleteTarget && (
        <div className="history-modal-overlay">

          <div className="history-modal">

            <div className="history-modal-icon">
              !
            </div>

            <h2>Delete analysis?</h2>

            <p>
              You are about to delete the analysis for{" "}
              <strong>
                {deleteTarget.jobTitle ||
                  "this position"}
              </strong>
              {deleteTarget.companyName
                ? ` at ${deleteTarget.companyName}`
                : ""}
              .
            </p>

            <p className="history-modal-warning">
              This action cannot be undone.
            </p>

            <div className="history-modal-actions">

              <button
                type="button"
                className="btn btn-secondary"
                disabled={deleting}
                onClick={() =>
                  setDeleteTarget(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="history-confirm-delete"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Analysis"}
              </button>

            </div>

          </div>

        </div>
      )}

      <footer className="footer">
        AI-Powered Job Application System | Sol Plaatje
        University | NPRJ740 — 2026
      </footer>
    </>
  );
}