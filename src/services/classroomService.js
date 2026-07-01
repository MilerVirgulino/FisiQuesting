import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase-init";
import { normalizeClassNameText, normalizeGradeText } from "./missionService";

export const fallbackGradeOptions = ["1 ano", "2 ano", "3 ano"];
export const fallbackClassOptions = ["A", "B", "C", "D", "E"];

function normalizeClassroom(source = {}) {
  const grade = normalizeGradeText(source.grade);
  const className = normalizeClassNameText(source.className);
  return {
    name: String(source.name || `${grade} ${className}`).trim(),
    grade,
    className,
    active: source.active !== false
  };
}

export function classroomKey(classroom = {}) {
  return `${classroom.grade || ""}|||${classroom.className || ""}`;
}

export function classroomLabel(classroom = {}) {
  const grade = classroom.grade || "sem serie";
  const className = classroom.className || "sem turma";
  const base = `${grade} - ${className}`;
  return classroom.name && classroom.name !== base ? `${classroom.name} (${base})` : base;
}

export function buildClassroomOptions(classrooms = [], users = []) {
  const groups = new Map();

  classrooms.forEach((classroom) => {
    if (!classroom.grade || !classroom.className) return;
    const current = {
      id: classroom.id || "",
      name: classroom.name || "",
      grade: classroom.grade,
      className: classroom.className,
      source: "firebase"
    };
    groups.set(classroomKey(current), current);
  });

  users.forEach((user) => {
    if (!user.grade || !user.className) return;
    const key = classroomKey(user);
    if (groups.has(key)) return;
    groups.set(key, {
      id: "",
      name: `${user.grade} ${user.className}`,
      grade: user.grade,
      className: user.className,
      source: "users"
    });
  });

  const options = [...groups.values()].sort((a, b) => a.grade.localeCompare(b.grade) || a.className.localeCompare(b.className));
  const gradeOptions = [...new Set([
    ...options.map((item) => item.grade),
    ...(options.length ? [] : fallbackGradeOptions)
  ].filter(Boolean))];
  const classOptions = [...new Set([
    ...options.map((item) => item.className),
    ...(options.length ? [] : fallbackClassOptions)
  ].filter(Boolean))];

  return {
    classrooms: options,
    classroomOptions: options.map((item) => ({
      value: classroomKey(item),
      label: classroomLabel(item),
      classroom: item
    })),
    gradeOptions,
    classOptions
  };
}

export async function listClassrooms() {
  const snapshot = await getDocs(query(collection(db, "classrooms"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function createClassroom(classroom) {
  const normalized = normalizeClassroom(classroom);
  return addDoc(collection(db, "classrooms"), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateClassroom(classroomId, classroom) {
  const normalized = normalizeClassroom(classroom);
  return updateDoc(doc(db, "classrooms", classroomId), {
    ...normalized,
    updatedAt: serverTimestamp()
  });
}

export function deleteClassroom(classroomId) {
  return deleteDoc(doc(db, "classrooms", classroomId));
}
