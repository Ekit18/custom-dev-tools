"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2>Something went wrong in the dashboard</h2>
      <p>{error.message}</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
