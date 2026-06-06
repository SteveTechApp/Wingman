
const wingmanWindow = window as Window & { __wingmanNewProjectHandlerInstalled?: boolean };

if (!wingmanWindow.__wingmanNewProjectHandlerInstalled) {
  wingmanWindow.__wingmanNewProjectHandlerInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const action = target.closest("button, a");

      if (!(action instanceof HTMLElement)) {
        return;
      }

      const text = (action.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      if (!text.includes("new project")) {
        return;
      }

      event.preventDefault();
      window.location.href = "/wingman/templates";
    },
    true,
  );
}


import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./wingman2/styles/wingman-style-stack.css";
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);






