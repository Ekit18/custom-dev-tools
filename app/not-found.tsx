import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: 480,
      }}
    >
      <h1>404 — Page not found</h1>
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </main>
  );
}
