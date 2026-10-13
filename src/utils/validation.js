// src/utils/validation.js

// ─────────────────────────────────────────────
// EMAIL VALIDATION
// ─────────────────────────────────────────────

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}


// ─────────────────────────────────────────────
// LOGIN VALIDATION
// ─────────────────────────────────────────────

export function validateLoginForm(email, password) {
  if (!email?.trim() || !password) {
    return "Email and password are required.";
  }

  if (!isValidEmail(email)) {
    return "Please provide a valid email address.";
  }

  /*
   * Do NOT apply the new strong-password rules here.
   * Existing users may have passwords created under
   * the previous 6-character requirement.
   */
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  return "";
}


// ─────────────────────────────────────────────
// REGISTRATION VALIDATION
// ─────────────────────────────────────────────

export function validateRegistrationForm({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}) {
  // First and last name
  if (!firstName?.trim() || !lastName?.trim()) {
    return "First name and last name are required.";
  }

  // Prevent extremely short names
  if (firstName.trim().length < 2) {
    return "First name must contain at least 2 characters.";
  }

  if (lastName.trim().length < 2) {
    return "Last name must contain at least 2 characters.";
  }

  // Email
  if (!email?.trim()) {
    return "Email address is required.";
  }

  if (!isValidEmail(email)) {
    return "Please provide a valid email address.";
  }

  // Password required
  if (!password) {
    return "Password is required.";
  }

  // Minimum length
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  // Number
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }

  // Special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character.";
  }

  // Confirm password required
  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  // Password match
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}


// ─────────────────────────────────────────────
// CV ANALYSIS FORM VALIDATION
// ─────────────────────────────────────────────

export function validateAnalysisForm({
  cvFile,
  jobTitle,
  jobDescription,
}) {
  if (!cvFile) {
    return "Please upload your CV file.";
  }

  if (!jobTitle?.trim()) {
    return "Please enter the job title.";
  }

  if (!jobDescription?.trim()) {
    return "Please enter the job description.";
  }

  if (jobDescription.trim().length < 50) {
    return "Please provide a more detailed job description (at least 50 characters).";
  }

  return "";
}