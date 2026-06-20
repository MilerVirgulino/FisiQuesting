import React, { useEffect, useState } from "react";
import { BookOpen, Home, LogOut, ShieldCheck, Swords, UserRound, UsersRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";
import { listUnreadInteractionCount } from "../services/socialService";

export default function Layout() {
  const { logout, profile, isAdmin } = useAuth();
  const [unreadInteractions, setUnreadInteractions] = useState(0);

  useEffect(() => {
    if (!profile?.id || profile?.status !== "approved") return;
    let active = true;

    function refreshUnreadCount() {
      listUnreadInteractionCount(profile.id)
      .then((count) => {
        if (active) setUnreadInteractions(count);
      })
      .catch(() => {
        if (active) setUnreadInteractions(0);
      });
    }

    refreshUnreadCount();
    window.addEventListener("fisioquest:social-updated", refreshUnreadCount);

    return () => {
      active = false;
      window.removeEventListener("fisioquest:social-updated", refreshUnreadCount);
    };
  }, [profile?.id, profile?.status]);

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
        <NavLink to="/avatar">
          <UserRound size={20} />
          <span>Avatar</span>
        </NavLink>
        <NavLink to="/colegas">
          <span className="nav-icon-badge-wrap">
            <UsersRound size={20} />
            {unreadInteractions > 0 && <span className="nav-notification-dot">{Math.min(9, unreadInteractions)}</span>}
          </span>
          <span>Colegas</span>
        </NavLink>
        <NavLink to="/batalha">
          <Swords size={20} />
          <span>Batalha</span>
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
