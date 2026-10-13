# AI Job Application System

A Firebase + React application that helps job applicants analyse CVs against job descriptions, review ATS compatibility, and generate tailored cover letters.

## Stack

- React 18
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Cloud Functions

## Prerequisites

- Node.js 18+
- npm
- A Firebase project
- Firebase CLI (`npm install -g firebase-tools`)

## Local setup

1. Clone the project.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root using the template in `.env.example`.
4. Fill in your Firebase config values.
5. Start the app:

   ```bash
   npm start
   ```

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication, Firestore, Storage, and Cloud Functions.
3. Add your web app config to `.env`.
4. Deploy the backend rules and functions:

   ```bash
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules,storage:rules,functions
   ```

5. Deploy the frontend build:

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Production notes

- Never commit real Firebase credentials to source control.
- Use environment variables for all configuration.
- Keep security rules strict and user-scoped.
- Validate user input at the client and enforce stricter backend checks.

## Project structure

- `src/` – React application code
- `functions/` – Firebase Cloud Functions
- `public/` – static assets
- `firestore.rules` – Firestore access rules
- `storage.rules` – Storage access rules
- `firebase.json` – Firebase deployment config
