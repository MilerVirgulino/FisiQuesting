import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authService.jsx";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { firebaseUser, profile, loading, isApproved, isAdmin } = useAuth();

  if (loading) {
    return <div className="screen-message">Carregando sessão...</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !isApproved) {
    return <Navigate to="/pending" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
