import React from "react";
import { BookOpen, Home, LogOut, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";

export default function Layout() {
  const { logout, profile, isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FisioQuest</p>
          <h1>Treino de Física</h1>
        </div>
        <div className="user-chip">
          <span>{profile?.name || "Estudante"}</span>
          <button type="button" className="icon-button" onClick={logout} aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <NavLink to="/">
          <Home size={20} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/questoes">
          <BookOpen size={20} />
          <span>Missões</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin">
            <ShieldCheck size={20} />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
