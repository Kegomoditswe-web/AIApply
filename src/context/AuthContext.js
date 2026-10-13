// src/context/AuthContext.js

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";


// ─────────────────────────────────────────────
// CREATE AUTH CONTEXT
// ─────────────────────────────────────────────

const AuthContext = createContext();


// ─────────────────────────────────────────────
// CUSTOM AUTH HOOK
// ─────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}


// ─────────────────────────────────────────────
// AUTH PROVIDER
// ─────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);


  // ───────────────────────────────────────────
  // REGISTER USER
  // ───────────────────────────────────────────

  async function register(
    email,
    password,
    firstName,
    lastName
  ) {
    // Create Firebase Authentication account
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Create user's display name
    await updateProfile(result.user, {
      displayName: `${firstName} ${lastName}`,
    });

    // Save additional profile information in Firestore
    await setDoc(doc(db, "users", result.user.uid), {
      firstName: firstName,
      lastName: lastName,
      emailAddress: email,
      dateRegistered: serverTimestamp(),
      isActive: true,
    });

    return result;
  }


  // ───────────────────────────────────────────
  // LOGIN USER
  // ───────────────────────────────────────────

  function login(email, password) {
    return signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  }


  // ───────────────────────────────────────────
  // LOGOUT USER
  // ───────────────────────────────────────────

  function logout() {
    return signOut(auth);
  }


  // ───────────────────────────────────────────
  // RESET PASSWORD
  // ───────────────────────────────────────────

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }


  // ───────────────────────────────────────────
  // LISTEN FOR AUTHENTICATION CHANGES
  // ───────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setLoading(false);
      }
    );

    // Remove listener when provider unmounts
    return unsubscribe;
  }, []);


  // ───────────────────────────────────────────
  // VALUES AVAILABLE THROUGH useAuth()
  // ───────────────────────────────────────────

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout,
    resetPassword,
  };


  // ───────────────────────────────────────────
  // PROVIDER
  // ───────────────────────────────────────────

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}