// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AppErrorBoundary from "./components/AppErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import AnalysePage from "./pages/AnalysePage";
import ResultsPage from "./pages/ResultsPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import CoverLetterPage from "./pages/CoverLetterPage";
import HistoryPage from "./pages/HistoryPage";

import "./index.css";

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparing the app..." />;
  }

  return currentUser ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />

            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/analyse" element={<PrivateRoute><AnalysePage /></PrivateRoute>} />
            <Route path="/results/:resultID" element={<PrivateRoute><ResultsPage /></PrivateRoute>} />
            <Route path="/suggestions/:resultID" element={<PrivateRoute><SuggestionsPage /></PrivateRoute>} />
            <Route path="/cover-letter/:resultID" element={<PrivateRoute><CoverLetterPage /></PrivateRoute>} />
            <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
