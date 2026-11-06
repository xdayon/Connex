import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "./components/AppShell";
import { PlainLayout } from "./components/PlainLayout";
import { Splash } from "./components/Splash";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { BadgePage } from "./pages/BadgePage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PublicProfilePage } from "./pages/PublicProfilePage";

const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage").then((m) => ({ default: m.ConnectionsPage })));
const ConnectionDetailPage = lazy(() => import("./pages/ConnectionDetailPage").then((m) => ({ default: m.ConnectionDetailPage })));
const ScanPage = lazy(() => import("./pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const EventsPage = lazy(() => import("./pages/EventsPage").then((m) => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage").then((m) => ({ default: m.EventDetailPage })));
const EventJoinPage = lazy(() => import("./pages/EventJoinPage").then((m) => ({ default: m.EventJoinPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const WelcomePage = lazy(() => import("./pages/WelcomePage").then((m) => ({ default: m.WelcomePage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then((m) => ({ default: m.LegalPage })));

function Gate() {
  const { session, profile, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Splash />;
  if (!session || !profile) return pathname === "/" ? <LandingPage /> : <Navigate to="/" replace />;
  if (!profile.handle) return <Navigate to="/welcome" replace />;
  return <AppShell />;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<Splash />}>
            <Routes>
              <Route path="/" element={<Gate />}>
                <Route index element={<BadgePage />} />
                <Route path="connections" element={<ConnectionsPage />} />
                <Route path="connections/:id" element={<ConnectionDetailPage />} />
                <Route path="scan" element={<ScanPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="events/:id" element={<EventDetailPage />} />
                <Route path="me" element={<ProfilePage />} />
              </Route>
              <Route path="welcome" element={<WelcomePage />} />
              <Route element={<PlainLayout />}>
                <Route path="u/:handle" element={<PublicProfilePage />} />
                <Route path="e/:code" element={<EventJoinPage />} />
                <Route path="legal/terms" element={<LegalPage kind="terms" />} />
                <Route path="legal/privacy" element={<LegalPage kind="privacy" />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
