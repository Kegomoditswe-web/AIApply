import React from "react";

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
