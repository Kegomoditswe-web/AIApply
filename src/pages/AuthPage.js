// src/pages/AuthPage.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  validateLoginForm,
  validateRegistrationForm,
} from "../utils/validation";

export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();

    const validationError = validateLoginForm(
      loginEmail,
      loginPassword
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await login(loginEmail.trim(), loginPassword);
      navigate("/");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      if (
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many failed attempts. Please try again later."
        );
      } else if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/user-disabled") {
        setError(
          "This account has been disabled. Please contact support."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault();

    const validationError = validateRegistrationForm({
      firstName,
      lastName,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirm,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await register(
        regEmail.trim(),
        regPassword,
        firstName.trim(),
        lastName.trim()
      );

      navigate("/");
    } catch (err) {
      console.error("REGISTRATION ERROR:", err);

      if (err?.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err?.code === "auth/weak-password") {
        setError(
          "Password is too weak. Please choose a stronger password."
        );
      } else if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/operation-not-allowed") {
        setError(
          "Email and password registration is currently unavailable."
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────
  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    const email = loginEmail.trim();

    if (!email) {
      setError(
        "Enter your email address first, then select Forgot password."
      );
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);

      setSuccess(
        "Password reset email sent. Please check your inbox."
      );
    } catch (err) {
      console.error("PASSWORD RESET ERROR:", err);

      if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err?.code === "auth/too-many-requests") {
        setError(
          "Too many requests. Please wait a moment and try again."
        );
      } else {
        setError(
          "We could not send the password reset email. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // TAB SWITCHING
  // ─────────────────────────────────────────────
  function switchTab(selectedTab) {
    setTab(selectedTab);
    setError("");
    setSuccess("");
  }

  // ─────────────────────────────────────────────
  // PASSWORD STRENGTH
  // ─────────────────────────────────────────────
  function getPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) {
      return {
        label: "",
        className: "",
        percentage: 0,
      };
    }

    if (score <= 2) {
      return {
        label: "Weak",
        className: "weak",
        percentage: 33,
      };
    }

    if (score <= 4) {
      return {
        label: "Good",
        className: "good",
        percentage: 66,
      };
    }

    return {
      label: "Strong",
      className: "strong",
      percentage: 100,
    };
  }

  const passwordStrength = getPasswordStrength(regPassword);

  return (
    <div className="auth-page">
      <div className="auth-shell">

        {/* ─────────────────────────────────────
            LEFT BRAND PANEL
        ───────────────────────────────────── */}
        <section className="auth-brand-panel">
          <div className="auth-brand-content">

            <div className="auth-brand-logo">
              AI<span>Apply</span>
            </div>

            <p className="auth-brand-tag">
              AI-Powered Job Application System
            </p>

            <div className="auth-brand-heading">
              <span className="auth-eyebrow">
                SMARTER JOB APPLICATIONS
              </span>

              <h1>
                Take the guesswork out of your next application.
              </h1>

              <p>
                Analyse your CV against job requirements, identify
                missing keywords and improve your application before
                you submit it.
              </p>
            </div>

            <div className="auth-features">

              <div className="auth-feature">
                <span className="feature-check">✓</span>

                <div>
                  <strong>ATS Compatibility Analysis</strong>
                  <p>
                    See how closely your CV matches the job
                    description.
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <span className="feature-check">✓</span>

                <div>
                  <strong>Keyword Insights</strong>
                  <p>
                    Identify important skills and keywords missing
                    from your CV.
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <span className="feature-check">✓</span>

                <div>
                  <strong>Application Suggestions</strong>
                  <p>
                    Get practical recommendations for strengthening
                    your application.
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <span className="feature-check">✓</span>

                <div>
                  <strong>Cover Letter Support</strong>
                  <p>
                    Create a tailored cover letter using your
                    application information.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <p className="auth-brand-footer">
            Built to help job seekers apply with confidence.
          </p>
        </section>

        {/* ─────────────────────────────────────
            RIGHT FORM PANEL
        ───────────────────────────────────── */}
        <section className="auth-form-panel">
          <div className="auth-card">

            <div className="auth-mobile-logo">
              <div className="brand-big">
                AI<span>Apply</span>
              </div>

              <p>AI-Powered Job Application System</p>
            </div>

            <div className="auth-welcome">
              <span className="auth-welcome-badge">
                {tab === "login"
                  ? "WELCOME BACK"
                  : "GET STARTED"}
              </span>

              <h2>
                {tab === "login"
                  ? "Sign in to your account"
                  : "Create your account"}
              </h2>

              <p>
                {tab === "login"
                  ? "Continue improving your job applications."
                  : "Start analysing and improving your job applications."}
              </p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${
                  tab === "login" ? "active" : ""
                }`}
                onClick={() => switchTab("login")}
                disabled={loading}
              >
                Login
              </button>

              <button
                type="button"
                className={`auth-tab ${
                  tab === "register" ? "active" : ""
                }`}
                onClick={() => switchTab("register")}
                disabled={loading}
              >
                Register
              </button>
            </div>

            {/* ───────────────────────────────
                LOGIN
            ─────────────────────────────── */}
            {tab === "login" ? (
              <form
                className="auth-form"
                onSubmit={handleLogin}
              >
                <div className="form-row">
                  <label htmlFor="login-email">
                    Email Address
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) =>
                      setLoginEmail(e.target.value)
                    }
                    placeholder="you@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="auth-label-row">
                    <label htmlFor="login-password">
                      Password
                    </label>

                    <button
                      type="button"
                      className="forgot-password-btn"
                      onClick={handleForgotPassword}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="password-input-wrap">
                    <input
                      id="login-password"
                      type={
                        showLoginPassword
                          ? "text"
                          : "password"
                      }
                      value={loginPassword}
                      onChange={(e) =>
                        setLoginPassword(e.target.value)
                      }
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowLoginPassword(
                          !showLoginPassword
                        )
                      }
                      aria-label={
                        showLoginPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showLoginPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="auth-message auth-error"
                    role="alert"
                  >
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div
                    className="auth-message auth-success"
                    role="status"
                  >
                    <span>✓</span>
                    <p>{success}</p>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-full auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Please wait...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                <p className="auth-switch-text">
                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchTab("register")
                    }
                    disabled={loading}
                  >
                    Create an account
                  </button>
                </p>
              </form>
            ) : (

              /* ───────────────────────────────
                  REGISTER
              ─────────────────────────────── */
              <form
                className="auth-form"
                onSubmit={handleRegister}
              >
                <div className="grid2 auth-name-grid">
                  <div className="form-row">
                    <label htmlFor="first-name">
                      First Name
                    </label>

                    <input
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) =>
                        setFirstName(e.target.value)
                      }
                      placeholder="First name"
                      autoComplete="given-name"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="last-name">
                      Last Name
                    </label>

                    <input
                      id="last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) =>
                        setLastName(e.target.value)
                      }
                      placeholder="Last name"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="register-email">
                    Email Address
                  </label>

                  <input
                    id="register-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) =>
                      setRegEmail(e.target.value)
                    }
                    placeholder="you@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="register-password">
                    Password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="register-password"
                      type={
                        showRegPassword
                          ? "text"
                          : "password"
                      }
                      value={regPassword}
                      onChange={(e) =>
                        setRegPassword(e.target.value)
                      }
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowRegPassword(
                          !showRegPassword
                        )
                      }
                    >
                      {showRegPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {regPassword && (
                    <div className="password-strength">
                      <div className="strength-heading">
                        <span>Password strength</span>

                        <strong
                          className={
                            passwordStrength.className
                          }
                        >
                          {passwordStrength.label}
                        </strong>
                      </div>

                      <div className="strength-track">
                        <div
                          className={`strength-fill ${passwordStrength.className}`}
                          style={{
                            width: `${passwordStrength.percentage}%`,
                          }}
                        />
                      </div>

                      <div className="password-rules">
                        <span
                          className={
                            regPassword.length >= 8
                              ? "valid"
                              : ""
                          }
                        >
                          ✓ 8+ characters
                        </span>

                        <span
                          className={
                            /[A-Z]/.test(regPassword)
                              ? "valid"
                              : ""
                          }
                        >
                          ✓ Uppercase
                        </span>

                        <span
                          className={
                            /[0-9]/.test(regPassword)
                              ? "valid"
                              : ""
                          }
                        >
                          ✓ Number
                        </span>

                        <span
                          className={
                            /[^A-Za-z0-9]/.test(
                              regPassword
                            )
                              ? "valid"
                              : ""
                          }
                        >
                          ✓ Special character
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <label htmlFor="confirm-password">
                    Confirm Password
                  </label>

                  <div className="password-input-wrap">
                    <input
                      id="confirm-password"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={regConfirm}
                      onChange={(e) =>
                        setRegConfirm(e.target.value)
                      }
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                    >
                      {showConfirmPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>

                  {regConfirm &&
                    regPassword === regConfirm && (
                      <p className="password-match">
                        ✓ Passwords match
                      </p>
                    )}
                </div>

                {error && (
                  <div
                    className="auth-message auth-error"
                    role="alert"
                  >
                    <span>!</span>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-full auth-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <p className="auth-switch-text">
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchTab("login")
                    }
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}

            <p className="auth-privacy-note">
              Your CV and application information are handled
              securely.
            </p>

          </div>
        </section>
      </div>
    </div>
  );
}