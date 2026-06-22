import React from "react";
import { Eye } from "lucide-react";
import ChoicePills from "./ChoicePills.jsx";
import { adminViewClassOptions, adminViewGradeOptions, writeAdminClassView } from "../services/adminViewService";

export default function AdminClassViewControl({ value, onChange, label = "Visao de teste do administrador" }) {
  function update(patch) {
    const next = writeAdminClassView({ ...value, ...patch });
    onChange?.(next);
  }

  return (
    <div className="admin-class-view-control">
      <div>
        <Eye size={18} />
        <span>{label}</span>
      </div>
      <ChoicePills label="Serie" value={value.grade} options={adminViewGradeOptions} onChange={(grade) => update({ grade })} className="compact" />
      <ChoicePills label="Turma" value={value.className} options={adminViewClassOptions} onChange={(className) => update({ className })} className="compact" />
    </div>
  );
}
