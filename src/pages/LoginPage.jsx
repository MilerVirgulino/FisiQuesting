import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";

export default function LoginPage() {
  const { firebaseUser, isApproved, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (firebaseUser && isApproved) return <Navigate to="/" replace />;
  if (firebaseUser && !isApproved) return <Navigate to="/pending" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(form);
      } else {
        await register(form);
      }
    } catch (exception) {
      setError("Não foi possível continuar. Confira os dados e tente novamente.");
      console.error(exception);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">FisioQuest</p>
        <h1>Aprenda Física resolvendo desafios curtos todos os dias.</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
          )}
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar cadastro"}
          </button>
        </form>
        <button type="button" className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Criar conta pendente de aprovação" : "Já tenho conta"}
        </button>
      </section>
    </main>
  );
}
