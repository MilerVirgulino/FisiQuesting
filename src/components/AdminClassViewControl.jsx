import React, { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import ChoicePills from "./ChoicePills.jsx";
import { writeAdminClassView } from "../services/adminViewService";
import { buildClassroomOptions, classroomKey, fallbackClassOptions, fallbackGradeOptions, listClassrooms } from "../services/classroomService";

export default function AdminClassViewControl({ value, onChange, label = "Visao de teste do administrador" }) {
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    let active = true;
    listClassrooms()
      .then((items) => {
        if (active) setClassrooms(items);
      })
      .catch((error) => console.warn("Nao foi possivel carregar turmas dinamicas.", error));

    return () => {
      active = false;
    };
  }, []);

  const classroomChoices = useMemo(() => {
    const built = buildClassroomOptions(classrooms);
    const currentKey = classroomKey(value);
    if (value?.grade && value?.className && !built.classroomOptions.some((option) => option.value === currentKey)) {
      built.classroomOptions.unshift({
        value: currentKey,
        label: `${value.grade} - ${value.className}`,
        classroom: { grade: value.grade, className: value.className }
      });
    }
    return built;
  }, [classrooms, value]);

  function update(patch) {
    const next = writeAdminClassView({ ...value, ...patch });
    onChange?.(next);
  }

  function updateClassroom(optionKey) {
    const selected = classroomChoices.classroomOptions.find((option) => option.value === optionKey)?.classroom;
    if (!selected) return;
    update({ grade: selected.grade, className: selected.className });
  }

  const selectedKey = classroomKey(value);
  const hasClassroomChoices = classroomChoices.classroomOptions.length > 0;

  return (
    <div className="admin-class-view-control">
      <div>
        <Eye size={18} />
        <span>{label}</span>
      </div>
      {hasClassroomChoices ? (
        <ChoicePills label="Turma" value={selectedKey} options={classroomChoices.classroomOptions} onChange={updateClassroom} className="compact" />
      ) : (
        <>
          <ChoicePills label="Serie" value={value.grade} options={fallbackGradeOptions} onChange={(grade) => update({ grade })} className="compact" />
          <ChoicePills label="Turma" value={value.className} options={fallbackClassOptions} onChange={(className) => update({ className })} className="compact" />
        </>
      )}
    </div>
  );
}
