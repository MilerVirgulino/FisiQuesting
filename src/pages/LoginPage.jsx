import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";

export default function LoginPage() {
  const { firebaseUser, isApproved, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", requestedClassTag: "" });
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
        if (form.password !== form.confirmPassword) {
          setError("As senhas nao conferem. Digite novamente antes de criar o cadastro.");
          return;
        }
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
        <p className="eyebrow">FisiQuest</p>
        <h1>Aprenda Física resolvendo desafios curtos todos os dias.</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <>
              <label>
                Nome
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Turma indicada
                <input
                  value={form.requestedClassTag}
                  onChange={(event) => setForm({ ...form, requestedClassTag: event.target.value })}
                  placeholder="Ex.: 1 ano A, 2 ano B, 3 ano C"
                  maxLength={80}
                />
                <small>Essa tag ajuda o professor a encontrar sua turma. Ela nao aloca voce automaticamente.</small>
              </label>
            </>
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
          {mode === "register" && (
            <label>
              Repetir senha
              <input
                type="password"
                minLength={6}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                required
              />
            </label>
          )}
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
