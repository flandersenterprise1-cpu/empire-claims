import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            background: "oklch(0.1 0.008 265)",
            color: "oklch(0.94 0.005 65)",
          }}
        >
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "oklch(0.6 0.015 265)", maxWidth: "32rem" }}>
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gold"
            style={{ marginTop: "0.5rem" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
