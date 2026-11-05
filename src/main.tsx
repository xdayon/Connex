import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { WalletProviders } from "./providers/WalletProviders";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </StrictMode>,
);
