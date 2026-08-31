/**
 * main.jsx
 * ========
 * Poori React app ka SABSE PEHLA point -- yehi file browser mein React
 * ko "on" karti hai. Ye "index.html" ke andar ek <script> tag ke
 * zariye load hoti hai.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);