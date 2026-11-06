import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { WalletProviders } from "./providers/WalletProviders";
import { registerSW } from "virtual:pwa-register";

// Web deploys must reach users quickly (the store APK only wraps this site).
// autoUpdate reloads the page once a new service worker takes over; we also check
// for a new version whenever the app comes back to the foreground and every hour.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) check();
    });
    window.setInterval(check, 60 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProviders>
      <App />
    </WalletProviders>
  </StrictMode>,
);
