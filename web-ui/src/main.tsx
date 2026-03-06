import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

function detectRouterBasename(): string {
  if (typeof window === "undefined") {
    return "/";
  }

  const knownPrefixes = ["/siderclaw-console"];
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
