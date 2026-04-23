import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./auth/LoginPage";
import { RequireAuth } from "./auth/RequireAuth";
import { ProtectedShell } from "./layout/ProtectedShell";
import { AdminConfigPage } from "./pages/AdminConfigPage";
import { HomePage } from "./pages/HomePage";
import { MatchFormPage } from "./pages/MatchFormPage";
import { MatchesPage } from "./pages/MatchesPage";
import { PlayerFormPage } from "./pages/PlayerFormPage";
import { PlayersPage } from "./pages/PlayersPage";

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedShell />}>
          <Route index element={<HomePage />} />
          <Route path="parties" element={<MatchesPage />} />
          <Route path="parties/ajout" element={<MatchFormPage mode="add" />} />
          <Route path="parties/:matchId/modifier" element={<MatchFormPage mode="edit" />} />
          <Route path="joueurs" element={<PlayersPage />} />
          <Route path="joueurs/ajout" element={<PlayerFormPage mode="add" />} />
          <Route path="joueurs/:playerId/modifier" element={<PlayerFormPage mode="edit" />} />
          <Route path="config" element={<AdminConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
