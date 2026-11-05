import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import { PlainLayout } from "./components/PlainLayout";
import { ConnectionsPage } from "./pages/ConnectionsPage";
import { EventsPage } from "./pages/EventsPage";
import { HomePage } from "./pages/HomePage";
import { LegalPage } from "./pages/LegalPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { ScanPage } from "./pages/ScanPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="me" element={<ProfilePage />} />
        </Route>
        <Route element={<PlainLayout />}>
          <Route path="u/:handle" element={<PublicProfilePage />} />
          <Route path="legal/terms" element={<LegalPage kind="terms" />} />
          <Route path="legal/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
