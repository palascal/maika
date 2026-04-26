import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { LoginPage } from "./auth/LoginPage";
import { RequireAuth } from "./auth/RequireAuth";
import { ProtectedShell } from "./layout/ProtectedShell";
import { AdminConfigPage } from "./pages/AdminConfigPage";
import { AdminPlayersManagementPage } from "./pages/AdminPlayersManagementPage";
import { HomePage } from "./pages/HomePage";
import { MatchFormPage } from "./pages/MatchFormPage";
import { MatchesPage } from "./pages/MatchesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PlayersPage } from "./pages/PlayersPage";

function RedirectAdminPlayerEdit() {
  const { playerId } = useParams();
  const to = playerId ? `/admin/joueurs?modifier=${encodeURIComponent(playerId)}` : "/admin/joueurs";
  return <Navigate to={to} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedShell />}>
          <Route index element={<HomePage />} />
          <Route path="parties" element={<MatchesPage />} />
          <Route path="parties/ajout" element={<Navigate to="/parties?nouveau=1" replace />} />
          <Route path="parties/:matchId/modifier" element={<MatchFormPage />} />
          <Route path="joueurs" element={<PlayersPage />} />
          <Route path="reglement" element={<Navigate to="/" replace />} />
          <Route path="joueurs/ajout" element={<Navigate to="/admin/joueurs?nouveau=1" replace />} />
          <Route path="joueurs/:playerId/modifier" element={<RedirectAdminPlayerEdit />} />
          <Route path="admin/joueurs" element={<AdminPlayersManagementPage />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="config" element={<AdminConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
