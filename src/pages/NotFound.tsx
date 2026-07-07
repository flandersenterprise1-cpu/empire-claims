import { Link } from "wouter";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2rem",
        textAlign: "center",
        background: "oklch(0.1 0.008 265)",
        color: "oklch(0.94 0.005 65)",
      }}
    >
      <div className="section-label">Error 404</div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "2.5rem", letterSpacing: "-0.02em" }}>
        Page Not Found
      </h1>
      <p style={{ color: "oklch(0.6 0.015 265)", maxWidth: "30rem" }}>
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link href="/" className="btn-gold" style={{ marginTop: "0.5rem" }}>
        Back to Home
      </Link>
    </div>
  );
}
