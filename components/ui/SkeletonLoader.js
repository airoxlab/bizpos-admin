import React from "react";

export default function LoadingCircle({ size = 40, color = "border-slate-400" }) {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-t-transparent ${color}`}
      style={{
        width: size,
        height: size,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
