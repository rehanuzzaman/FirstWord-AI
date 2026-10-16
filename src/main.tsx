import React from "react";
import { createRoot } from "react-dom/client";
import App from "./GameApp";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Let’s try that again.</h1>
        <p>Your saved profile remains on this local server.</p>
        <button onClick={() => location.reload()}>Reload FirstWord</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
