import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.includes("/api/")) {
    init = { ...init, credentials: "include" as RequestCredentials };
  }
  return originalFetch.call(this, input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
