import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

type BoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, BoundaryState> {
  state: BoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Root render failed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "32px",
            background: "#0b1318",
            color: "#f7e7d5",
            fontFamily: "IBM Plex Sans, sans-serif"
          }}
        >
          <h1 style={{ marginTop: 0 }}>页面运行失败</h1>
          <p>前端在渲染阶段抛出了错误，下面是具体信息：</p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "16px",
              borderRadius: "16px"
            }}
          >
            {this.state.error.stack || this.state.error.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  console.error("Window error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
