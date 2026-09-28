import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fontes servidas pelo próprio app (sem depender do Google Fonts em tempo de execução).
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/geist-mono/400.css";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
