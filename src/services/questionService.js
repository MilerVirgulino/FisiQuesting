import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";

export async function listActiveQuestions(filters = {}) {
  const questions = await listAllQuestions();
  return questions
    .filter((question) => question.active !== false)
    .filter((question) => !filters.area || question.area === filters.area)
    .filter((question) => !filters.difficulty || question.difficulty === filters.difficulty)
    .slice(0, 30);
}

export async function listAllQuestions() {
  const snapshot = await getDocs(collection(db, "questions"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function getQuestionsByIds(questionIds = []) {
  const uniqueIds = [...new Set(questionIds)].filter(Boolean);
  if (!uniqueIds.length) return [];

  const chunks = [];
  for (let index = 0; index < uniqueIds.length; index += 10) {
    chunks.push(uniqueIds.slice(index, index + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, "questions"), where(documentId(), "in", ids)))
    )
  );

  const questions = snapshots
    .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    .filter((question) => question.active !== false);
  const byId = new Map(questions.map((question) => [question.id, question]));

  return uniqueIds.map((id) => byId.get(id)).filter(Boolean);
}

export function createQuestion(question) {
  return addDoc(collection(db, "questions"), {
    ...question,
    active: Boolean(question.active),
    xp: Number(question.xp || 10),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateQuestion(questionId, patch) {
  return updateDoc(doc(db, "questions", questionId), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export function deleteQuestion(questionId) {
  return deleteDoc(doc(db, "questions", questionId));
}
