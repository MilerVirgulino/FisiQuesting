import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";

export default function PendingPage() {
  const { firebaseUser, profile, isApproved, logout } = useAuth();

  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (isApproved) return <Navigate to="/" replace />;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Cadastro em análise</p>
        <h1>Seu acesso às atividades ainda precisa de aprovação.</h1>
        <p className="muted">
          Status atual: <strong>{profile?.status || "pendente"}</strong>. Um administrador deve liberar seu cadastro
          antes do treino de questões.
        </p>
        <button type="button" onClick={logout}>Sair</button>
      </section>
    </main>
  );
}
