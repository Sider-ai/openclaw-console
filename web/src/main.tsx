import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

function detectRouterBasename(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const knownPrefixes = ["/openclaw-console"];
  const pathname = window.location.pathname;

  const matched = knownPrefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return matched || "/";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={detectRouterBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
