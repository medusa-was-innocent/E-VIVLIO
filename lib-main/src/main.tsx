if (import.meta.env.BASE_URL === "/lib/") { const s = document.createElement("script"); s.type="module"; s.src="/ecosystem/navigation.js"; document.head.append(s); }
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
