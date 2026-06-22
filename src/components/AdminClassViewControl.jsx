import React from "react";
import { Eye } from "lucide-react";
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
      <label>
        Serie
        <select value={value.grade} onChange={(event) => update({ grade: event.target.value })}>
          {adminViewGradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
        </select>
      </label>
      <label>
        Turma
        <select value={value.className} onChange={(event) => update({ className: event.target.value })}>
          {adminViewClassOptions.map((className) => <option value={className} key={className}>{className}</option>)}
        </select>
      </label>
    </div>
  );
}
