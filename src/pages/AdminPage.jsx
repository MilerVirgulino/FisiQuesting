import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpen, CircleDollarSign, Download, GripVertical, Lock, Palette, RadioTower, Share2, Target, Trash2, TrendingUp, Trophy, Users } from "lucide-react";
import AvatarPreview from "../components/AvatarPreview.jsx";
import PixelAccessoryEditor from "../components/PixelAccessoryEditor.jsx";
import {
  approveAccessoryRequestToShop,
  createAdminAccessoryRequestCopy,
  deleteAccessoryRequest,
  listAccessoryRequests,
  updateAccessoryRequestDetails,
  updateAccessoryRequestStatus
} from "../services/accessoryRequestService";
import {
  approveUser,
  awardUserReward,
  deleteUserProfile,
  listMissionAttempts,
  listUsers,
  rejectUser,
  sendUserPasswordReset,
  updateUserClass,
  updateUserProfile
} from "../services/adminService";
import { createMission, deleteMission, listAllMissions, updateMission } from "../services/missionService";
import { createQuestion, deleteQuestion, listAllQuestions, updateQuestion } from "../services/questionService";
import { getSocialConfig, saveSocialConfig, socialVisibilityOptions } from "../services/socialService";
import { defaultEconomyConfig, getEconomyConfig, saveEconomyConfig } from "../services/economyService";
import { getRenderablePixelArtSrc } from "../utils/pixelArt";
import { getAvatarOptions, loadAvatarCatalog } from "../services/avatarCatalogService";

const areas = ["Mecanica", "Termologia", "Optica", "Eletricidade", "Ondulatoria", "Fisica Moderna"];
const difficulties = ["facil", "medio", "dificil"];
const gradeOptions = ["1 ano", "2 ano", "3 ano"];
const classOptions = ["A", "B", "C", "D", "E"];
const UNASSIGNED_CLASS_KEY = "__unassigned__";

const initialQuestion = {
  statement: "",
  alternatives: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  area: "Mecanica",
  difficulty: "facil",
  xp: 10,
  active: true
};

const initialMission = {
  title: "",
  description: "",
  targetGrade: "1 ano",
  targetClass: "A",
  questionIds: [],
  rewardXp: 50,
  rewardCoins: 100,
  targetMinutes: 10,
  status: "open",
  startsAt: "",
  endsAt: ""
};

const tabs = [
  { id: "missions", label: "Missoes", icon: RadioTower },
  { id: "questions", label: "Questoes", icon: BookOpen },
  { id: "classes", label: "Turmas", icon: Users },
  { id: "creations", label: "Criacoes", icon: Palette },
  { id: "finance", label: "Economia", icon: CircleDollarSign },
  { id: "social", label: "Social", icon: Share2 },
  { id: "analytics", label: "Graficos", icon: BarChart3 }
];

function buildClassStats(users) {
  const groups = new Map();
  users
    .filter((user) => user.role !== "admin" && user.status === "approved")
    .filter((user) => user.grade && user.className)
    .forEach((user) => {
      const grade = user.grade || "Sem serie";
      const className = user.className || "Sem turma";
      const key = `${grade} - ${className}`;
      const current = groups.get(key) || {
        key,
        grade,
        className,
        students: 0,
        approvedStudents: 0,
        solved: 0,
        correct: 0,
        xp: 0,
        coins: 0,
        bestStreak: 0,
        activeStudents: 0
      };
      const solved = Number(user.solvedCount || 0);
      const correct = Number(user.correctCount || 0);

      current.students += 1;
      current.approvedStudents += user.status === "approved" ? 1 : 0;
      current.solved += solved;
      current.correct += correct;
      current.xp += Number(user.totalXp || 0);
      current.coins += Number(user.coins || 0);
      current.bestStreak = Math.max(current.bestStreak, Number(user.bestStreak || 0));
      current.activeStudents += solved > 0 ? 1 : 0;
      groups.set(key, current);
    });

  return [...groups.values()].map((group) => ({
    ...group,
    accuracy: group.solved ? Math.round((group.correct / group.solved) * 100) : 0,
    avgXp: group.students ? Math.round(group.xp / group.students) : 0,
    avgSolved: group.students ? Number((group.solved / group.students).toFixed(1)) : 0,
    avgCoins: group.students ? Math.round(group.coins / group.students) : 0,
    participation: group.students ? Math.round((group.activeStudents / group.students) * 100) : 0
  })).sort((a, b) => a.grade.localeCompare(b.grade) || a.className.localeCompare(b.className));
}

function getAccessoryPreviewSrc(item) {
  return getRenderablePixelArtSrc({
    pixelData: item?.pixelData,
    imageDataUrl: item?.imageDataUrl,
    src: item?.src
  });
}

function buildAggregateStats(groups) {
  const totals = groups.reduce(
    (current, group) => ({
      classes: current.classes + 1,
      students: current.students + group.students,
      approvedStudents: current.approvedStudents + group.approvedStudents,
      solved: current.solved + group.solved,
      correct: current.correct + group.correct,
      xp: current.xp + group.xp,
      activeStudents: current.activeStudents + group.activeStudents
    }),
    { classes: 0, students: 0, approvedStudents: 0, solved: 0, correct: 0, xp: 0, activeStudents: 0 }
  );

  return {
    ...totals,
    accuracy: totals.solved ? Math.round((totals.correct / totals.solved) * 100) : 0,
    avgXp: totals.students ? Math.round(totals.xp / totals.students) : 0,
    avgSolved: totals.students ? Number((totals.solved / totals.students).toFixed(1)) : 0,
    participation: totals.students ? Math.round((totals.activeStudents / totals.students) * 100) : 0
  };
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMissionTime(mission) {
  const startTime = timestampToMillis(mission.startsAt);
  const createdTime = timestampToMillis(mission.createdAt);
  const parsedStart = new Date(mission.startsAt || "").getTime();

  return startTime || (Number.isFinite(parsedStart) ? parsedStart : 0) || createdTime;
}

function formatMissionPeriod(mission) {
  if (mission.startsAt && mission.endsAt) return `${mission.startsAt} a ${mission.endsAt}`;
  if (mission.startsAt) return `Inicio ${mission.startsAt}`;
  return "Periodo nao definido";
}

function buildMissionEvolution({ attempts, missions, users, filters }) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));
  const groups = new Map();

  attempts.forEach((attempt) => {
    if (!attempt.completed) return;

    const mission = missionsById.get(attempt.missionId);
    const user = usersById.get(attempt.userId);
    const grade = mission?.targetGrade || user?.grade || "Sem serie";
    const className = mission?.targetClass || user?.className || "Sem turma";

    if (filters.grade && grade !== filters.grade) return;
    if (filters.className && className !== filters.className) return;

    const key = attempt.missionId || attempt.id;
    const current = groups.get(key) || {
      key,
      missionId: key,
      title: mission?.title || "Missao sem titulo",
      period: mission ? formatMissionPeriod(mission) : "Periodo nao definido",
      grade,
      className,
      time: mission ? getMissionTime(mission) : timestampToMillis(attempt.submittedAt),
      attempts: 0,
      solved: 0,
      correct: 0,
      xpEarned: 0,
      coinsEarned: 0,
      participants: new Set()
    };

    current.attempts += 1;
    current.solved += Number(attempt.solved || 0);
    current.correct += Number(attempt.correct || 0);
    current.xpEarned += Number(attempt.xpEarned || 0);
    current.coinsEarned += Number(attempt.coinsEarned || 0);
    current.participants.add(attempt.userId);
    groups.set(key, current);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      participants: group.participants.size,
      accuracy: group.solved ? Math.round((group.correct / group.solved) * 100) : 0,
      avgXp: group.attempts ? Math.round(group.xpEarned / group.attempts) : 0,
      avgCoins: group.attempts ? Math.round(group.coinsEarned / group.attempts) : 0
    }))
    .sort((a, b) => a.time - b.time);
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("missions");
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [missionAttempts, setMissionAttempts] = useState([]);
  const [accessoryRequests, setAccessoryRequests] = useState([]);
  const [accessoryShopPrices, setAccessoryShopPrices] = useState({});
  const [accessoryShopCategories, setAccessoryShopCategories] = useState({});
  const [accessoryTitles, setAccessoryTitles] = useState({});
  const [editingAccessoryArt, setEditingAccessoryArt] = useState(null);
  const [editingAccessoryPixelData, setEditingAccessoryPixelData] = useState(null);
  const [savingAccessoryArt, setSavingAccessoryArt] = useState(false);
  const [adminAvatarCatalog, setAdminAvatarCatalog] = useState(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [mission, setMission] = useState(initialMission);
  const [loadErrors, setLoadErrors] = useState([]);
  const [draggingQuestionId, setDraggingQuestionId] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [questionFilters, setQuestionFilters] = useState({ area: "", difficulty: "" });
  const [analyticsFilters, setAnalyticsFilters] = useState({ grade: "", className: "" });
  const [classFilters, setClassFilters] = useState({ grade: "", className: "" });
  const [studentSearch, setStudentSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [rewardingUser, setRewardingUser] = useState(null);
  const [classMessage, setClassMessage] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingMission, setEditingMission] = useState(null);
  const [socialConfig, setSocialConfig] = useState({ visibilityScope: "class" });
  const [socialMessage, setSocialMessage] = useState("");
  const [economyConfig, setEconomyConfig] = useState(defaultEconomyConfig);
  const [economyMessage, setEconomyMessage] = useState("");
  const adminGuideBase = useMemo(
    () => getAvatarOptions(adminAvatarCatalog, "base").find((option) => option.source !== "svg" && option.src) || null,
    [adminAvatarCatalog]
  );
  const adminGuideBaseSrc = useMemo(() => {
    if (adminGuideBase?.src) return adminGuideBase.src;

    const listedBaseRequest = accessoryRequests.find((item) => {
      return item.status === "listed"
        && (item.shopCategoryKey === "base" || item.category === "base")
        && (item.pixelData || item.imageDataUrl || item.src);
    });

    return listedBaseRequest ? getRenderablePixelArtSrc(listedBaseRequest) : "";
  }, [adminGuideBase, accessoryRequests]);
  const editingArtUsesGuide = Boolean(
    editingAccessoryArt
      && editingAccessoryArt.category !== "emojis"
      && editingAccessoryArt.category !== "base"
      && editingAccessoryArt.shopCategoryKey !== "base"
      && adminGuideBaseSrc
  );

  const classStats = useMemo(() => buildClassStats(users), [users]);
  const pendingStudents = useMemo(
    () => users.filter((user) => user.role !== "admin" && (user.status || "pending") === "pending"),
    [users]
  );
  const unassignedUsers = useMemo(
    () => users.filter((user) => {
      if (user.role === "admin") return true;
      return user.status === "approved" && (!user.grade || !user.className);
    }),
    [users]
  );
  const isPendingClassView = classFilters.grade === "__pending__";
  const isUnassignedClassView = classFilters.grade === UNASSIGNED_CLASS_KEY;
  const pendingClassStats = useMemo(
    () => ({
      key: "Alunos pendentes",
      grade: "__pending__",
      className: "",
      students: pendingStudents.length,
      approvedStudents: 0,
      solved: pendingStudents.reduce((total, user) => total + Number(user.solvedCount || 0), 0),
      correct: pendingStudents.reduce((total, user) => total + Number(user.correctCount || 0), 0),
      accuracy: 0,
      participation: 0,
      isPending: true
    }),
    [pendingStudents]
  );
  const unassignedClassStats = useMemo(
    () => ({
      key: "Sem turma definida",
      grade: UNASSIGNED_CLASS_KEY,
      className: "",
      students: unassignedUsers.length,
      approvedStudents: unassignedUsers.filter((user) => user.status === "approved" || user.role === "admin").length,
      solved: unassignedUsers.reduce((total, user) => total + Number(user.solvedCount || 0), 0),
      correct: unassignedUsers.reduce((total, user) => total + Number(user.correctCount || 0), 0),
      accuracy: 0,
      participation: 0,
      isUnassigned: true
    }),
    [unassignedUsers]
  );
  const selectedClassStats = useMemo(
    () => {
      if (isPendingClassView) return pendingClassStats;
      if (isUnassignedClassView) return unassignedClassStats;
      return classStats.find((item) => item.grade === classFilters.grade && item.className === classFilters.className) || null;
    },
    [classStats, classFilters, isPendingClassView, isUnassignedClassView, pendingClassStats, unassignedClassStats]
  );
  const classStudents = useMemo(
    () =>
      users
        .filter((user) => {
          if (isPendingClassView) return (user.status || "pending") === "pending";
          if (isUnassignedClassView) return user.role === "admin" || (user.status === "approved" && (!user.grade || !user.className));
          if (user.role === "admin") return false;
          return user.status === "approved" && (!classFilters.grade || user.grade === classFilters.grade);
        })
        .filter((user) => isPendingClassView || isUnassignedClassView || !classFilters.className || user.className === classFilters.className)
        .filter((user) => {
          const search = studentSearch.trim().toLowerCase();
          if (!search) return true;
          return [user.name, user.email, user.grade, user.className]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        })
        .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email))),
    [users, classFilters, studentSearch, isPendingClassView, isUnassignedClassView]
  );
  const classMissions = useMemo(
    () => {
      if (isPendingClassView || isUnassignedClassView) return [];
      return missions
        .filter((item) => !classFilters.grade || item.targetGrade === classFilters.grade)
        .filter((item) => !classFilters.className || item.targetClass === classFilters.className)
        .map((item) => {
          const attempts = missionAttempts.filter((attempt) => attempt.missionId === item.id);
          const completedAttempts = attempts.filter((attempt) => attempt.completed);
          const solved = completedAttempts.reduce((total, attempt) => total + Number(attempt.solved || 0), 0);
          const correct = completedAttempts.reduce((total, attempt) => total + Number(attempt.correct || 0), 0);
          return {
            ...item,
            attempts: completedAttempts.length,
            accuracy: solved ? Math.round((correct / solved) * 100) : 0
          };
        });
    },
    [missions, missionAttempts, classFilters, isPendingClassView, isUnassignedClassView]
  );
  const openClassMissions = useMemo(
    () => classMissions.filter((item) => item.status === "open"),
    [classMissions]
  );
  const closedClassMissions = useMemo(
    () => classMissions.filter((item) => item.status !== "open"),
    [classMissions]
  );
  const filteredClassStats = useMemo(
    () =>
      classStats
        .filter((item) => !analyticsFilters.grade || item.grade === analyticsFilters.grade)
        .filter((item) => !analyticsFilters.className || item.className === analyticsFilters.className),
    [classStats, analyticsFilters]
  );
  const analyticsSummary = useMemo(() => buildAggregateStats(filteredClassStats), [filteredClassStats]);
  const selectedClass = filteredClassStats.length === 1 ? filteredClassStats[0] : null;
  const topClasses = useMemo(
    () => filteredClassStats.slice().sort((a, b) => b.accuracy - a.accuracy || b.solved - a.solved).slice(0, 5),
    [filteredClassStats]
  );
  const maxSolved = Math.max(1, ...filteredClassStats.map((item) => item.solved));
  const missionEvolution = useMemo(
    () => buildMissionEvolution({ attempts: missionAttempts, missions, users, filters: analyticsFilters }),
    [missionAttempts, missions, users, analyticsFilters]
  );
  const maxEvolutionAttempts = Math.max(1, ...missionEvolution.map((item) => item.attempts));
  const filteredQuestions = useMemo(
    () =>
      questions
        .filter((item) => !questionFilters.area || item.area === questionFilters.area)
        .filter((item) => !questionFilters.difficulty || item.difficulty === questionFilters.difficulty),
    [questions, questionFilters]
  );
  const activeQuestions = useMemo(
    () => filteredQuestions.filter((item) => item.active !== false),
    [filteredQuestions]
  );
  const selectedQuestions = useMemo(
    () => mission.questionIds.map((id) => questions.find((item) => item.id === id)).filter(Boolean),
    [mission.questionIds, questions]
  );

  async function refresh() {
    const results = await Promise.allSettled([
      listUsers(),
      listAllQuestions(),
      listAllMissions(),
      listMissionAttempts(),
      listAccessoryRequests(),
      getSocialConfig(),
      getEconomyConfig(),
      loadAvatarCatalog({ force: true })
    ]);
    const labels = ["usuarios", "questoes", "missoes", "tentativas", "criacoes", "social", "economia", "catalogo"];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        errors.push(`${labels[index]}: ${result.reason?.message || "falha de permissao"}`);
        return;
      }

      if (index === 0) setUsers(result.value);
      if (index === 1) setQuestions(result.value);
      if (index === 2) setMissions(result.value);
      if (index === 3) setMissionAttempts(result.value);
      if (index === 4) setAccessoryRequests(result.value);
      if (index === 5) setSocialConfig(result.value);
      if (index === 6) setEconomyConfig(result.value);
      if (index === 7) setAdminAvatarCatalog(result.value);
    });

    setLoadErrors(errors);
  }

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  async function handleCreateQuestion(event) {
    event.preventDefault();
    await createQuestion({
      ...question,
      alternatives: question.alternatives.filter(Boolean),
      correctIndex: Number(question.correctIndex),
      xp: Number(question.xp)
    });
    setQuestion(initialQuestion);
    await refresh();
  }

  async function handleCreateMission(event) {
    event.preventDefault();
    await createMission(mission);
    setMission(initialMission);
    await refresh();
  }

  function startEditMission(item) {
    setEditingMission({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      targetGrade: gradeOptions.includes(item.targetGrade) ? item.targetGrade : "1 ano",
      targetClass: classOptions.includes(item.targetClass) ? item.targetClass : "A",
      rewardXp: Number(item.rewardXp || 0),
      rewardCoins: Number(item.rewardCoins || 0),
      targetMinutes: Number(item.targetMinutes || 0),
      status: item.status || "open",
      startsAt: item.startsAt || "",
      endsAt: item.endsAt || ""
    });
  }

  async function handleSaveMissionEdit(event) {
    event.preventDefault();
    if (!editingMission) return;

    const { id, ...missionPatch } = editingMission;
    await updateMission(id, missionPatch);
    setEditingMission(null);
    await refresh();
  }

  async function handleDeleteMission(missionId) {
    const shouldDelete = window.confirm("Excluir esta missao? As tentativas ja enviadas pelos alunos nao serao apagadas.");
    if (!shouldDelete) return;

    await deleteMission(missionId);
    await refresh();
  }

  function addMissionQuestion(questionId) {
    if (!questionId || mission.questionIds.includes(questionId)) return;
    setMission((current) => ({ ...current, questionIds: [...current.questionIds, questionId] }));
  }

  function removeMissionQuestion(questionId) {
    setMission((current) => ({
      ...current,
      questionIds: current.questionIds.filter((id) => id !== questionId)
    }));
  }

  function handleDrop(event) {
    event.preventDefault();
    const questionId = event.dataTransfer.getData("text/question-id") || draggingQuestionId;
    addMissionQuestion(questionId);
    setDraggingQuestionId("");
    setDropActive(false);
  }

  async function handleDeleteQuestion(questionId) {
    const shouldDelete = window.confirm("Apagar esta questao do banco de dados?");
    if (!shouldDelete) return;

    await deleteQuestion(questionId);
    setMission((current) => ({
      ...current,
      questionIds: current.questionIds.filter((id) => id !== questionId)
    }));
    await refresh();
  }

  function startEditQuestion(item) {
    setEditingQuestion({
      id: item.id,
      statement: item.statement || "",
      alternatives: [...(item.alternatives || ["", "", "", ""]), "", "", "", ""].slice(0, 4),
      correctIndex: Number(item.correctIndex || 0),
      explanation: item.explanation || "",
      area: item.area || "Mecanica",
      difficulty: item.difficulty || "facil",
      xp: Number(item.xp || 10),
      active: item.active !== false
    });
  }

  async function handleSaveQuestionEdit(event) {
    event.preventDefault();
    if (!editingQuestion) return;

    await updateQuestion(editingQuestion.id, {
      statement: editingQuestion.statement,
      alternatives: editingQuestion.alternatives.filter(Boolean),
      correctIndex: Number(editingQuestion.correctIndex),
      explanation: editingQuestion.explanation,
      area: editingQuestion.area,
      difficulty: editingQuestion.difficulty,
      xp: Number(editingQuestion.xp || 0),
      active: editingQuestion.active
    });
    setEditingQuestion(null);
    await refresh();
  }

  function startEditUser(user) {
    setClassMessage("");
    setEditingUser({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      grade: gradeOptions.includes(user.grade) ? user.grade : "1 ano",
      className: classOptions.includes(user.className) ? user.className : "A",
      status: user.status || "pending"
    });
  }

  async function handleSaveUserEdit(event) {
    event.preventDefault();
    if (!editingUser) return;

    await updateUserProfile(editingUser.id, editingUser);
    setEditingUser(null);
    setClassMessage("Aluno atualizado.");
    await refresh();
  }

  async function handlePasswordReset(user) {
    setClassMessage("");
    await sendUserPasswordReset(user.email);
    setClassMessage(`E-mail de redefinicao enviado para ${user.email}.`);
  }

  async function handleDeleteUser(user) {
    const shouldDelete = window.confirm(`Remover o perfil de ${user.name || user.email}? A conta de login no Firebase Auth precisa ser removida depois via Admin SDK/console.`);
    if (!shouldDelete) return;

    await deleteUserProfile(user.id);
    setClassMessage("Perfil removido do Firestore. A conta de autenticacao ainda deve ser removida no Firebase Auth.");
    await refresh();
  }

  async function handleAwardUser(event) {
    event.preventDefault();
    if (!rewardingUser) return;

    await awardUserReward(rewardingUser.id, {
      xp: rewardingUser.xp,
      coins: rewardingUser.coins
    });
    setClassMessage(`Premio aplicado: +${Number(rewardingUser.xp || 0)} XP e +${Number(rewardingUser.coins || 0)} moedas.`);
    setRewardingUser(null);
    await refresh();
  }

  function downloadAccessoryRequest(item) {
    const src = getAccessoryPreviewSrc(item);
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = item.fileName || `${item.title || "acessorio"}.png`;
    link.click();
  }

  async function handleAccessoryStatus(item, status) {
    await updateAccessoryRequestStatus(item.id, status);
    await refresh();
  }

  async function handleAccessoryPublish(item) {
    const categoryKey = accessoryShopCategories[item.id] || item.shopCategoryKey || item.category || "accessories";
    const price = categoryKey === "base"
      ? 0
      : Number(accessoryShopPrices[item.id] ?? item.shopPrice ?? economyConfig.avatarItemPrice ?? defaultEconomyConfig.avatarItemPrice);
    await approveAccessoryRequestToShop(item, { price, categoryKey });
    await refresh();
  }

  async function handleAccessoryDelete(item) {
    const shouldDelete = window.confirm(`Excluir definitivamente "${item.title || "esta criacao"}" do catalogo?`);
    if (!shouldDelete) return;
    await deleteAccessoryRequest(item.id);
    await refresh();
  }

  async function handleAccessoryTitleSave(item) {
    const title = String(accessoryTitles[item.id] ?? item.title ?? "").trim();
    if (!title) return;
    await updateAccessoryRequestDetails(item.id, { title });
    await refresh();
  }

  function handleAccessoryArtEdit(item) {
    setEditingAccessoryArt(item);
    setEditingAccessoryPixelData(item.pixelData || null);
  }

  function handleAccessoryArtDuplicate(item) {
    if (!item.pixelData) return;
    setEditingAccessoryArt({
      ...item,
      id: `${item.id}_duplicate_${Date.now()}`,
      title: `${item.title || "Criacao"} - copia`,
      duplicatedFromId: item.id
    });
    setEditingAccessoryPixelData(item.pixelData);
  }

  async function handleAccessoryArtSave(event) {
    event.preventDefault();
    if (!editingAccessoryArt || !editingAccessoryPixelData || editingAccessoryArt.duplicatedFromId) return;

    setSavingAccessoryArt(true);
    try {
      await updateAccessoryRequestDetails(editingAccessoryArt.id, {
        pixelData: editingAccessoryPixelData,
        imageDataUrl: "",
        src: ""
      });
      setEditingAccessoryArt(null);
      setEditingAccessoryPixelData(null);
      await refresh();
    } finally {
      setSavingAccessoryArt(false);
    }
  }

  async function handleAccessoryArtCreateCopy() {
    if (!editingAccessoryArt || !editingAccessoryPixelData) return;

    setSavingAccessoryArt(true);
    try {
      await createAdminAccessoryRequestCopy(editingAccessoryArt, {
        title: editingAccessoryArt.duplicatedFromId
          ? editingAccessoryArt.title
          : `${editingAccessoryArt.title || "Criacao"} - copia`,
        pixelData: editingAccessoryPixelData
      });
      setEditingAccessoryArt(null);
      setEditingAccessoryPixelData(null);
      await refresh();
    } finally {
      setSavingAccessoryArt(false);
    }
  }

  async function handleSaveSocialConfig(event) {
    event.preventDefault();
    setSocialMessage("");
    await saveSocialConfig(socialConfig);
    setSocialMessage("Configuracao social salva.");
  }

  async function handleSaveEconomyConfig(event) {
    event.preventDefault();
    setEconomyMessage("");
    await saveEconomyConfig(economyConfig);
    setEconomyMessage("Controle financeiro salvo.");
  }

  return (
    <section className="page-stack">
      <div className="teacher-hero">
        <div>
          <p className="eyebrow">Painel do professor</p>
          <h2>Missoes, turmas e leitura pedagogica.</h2>
          <span>Esta area nao fica visivel para alunos.</span>
        </div>
        <Lock size={40} />
      </div>

      <nav className="admin-tabs" aria-label="Areas do painel admin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              key={tab.id}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {loadErrors.length > 0 && (
        <section className="admin-warning">
          <strong>Algumas leituras foram bloqueadas pelo Firestore.</strong>
          <p>Confira se as regras publicadas sao as mesmas do arquivo `firestore.rules` e se sua conta tem `role: admin` e `status: approved`.</p>
          <ul>
            {loadErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      )}

      {activeTab === "missions" && (
        <>
          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Missao semanal</p>
                <h3>Arraste questoes para montar a quest</h3>
              </div>
              <RadioTower size={26} />
            </div>
            <form className="admin-form" onSubmit={handleCreateMission}>
              <div className="form-grid">
                <label>
                  Titulo
                  <input value={mission.title} onChange={(event) => setMission({ ...mission, title: event.target.value })} required />
                </label>
                <label>
                  Descricao
                  <input
                    value={mission.description}
                    onChange={(event) => setMission({ ...mission, description: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Serie
                  <select
                    value={mission.targetGrade}
                    onChange={(event) => setMission({ ...mission, targetGrade: event.target.value })}
                    required
                  >
                    {gradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
                  </select>
                </label>
                <label>
                  Turma
                  <select
                    value={mission.targetClass}
                    onChange={(event) => setMission({ ...mission, targetClass: event.target.value })}
                    required
                  >
                    {classOptions.map((className) => <option value={className} key={className}>{className}</option>)}
                  </select>
                </label>
                <label>
                  XP bonus
                  <input
                    type="number"
                    min="0"
                    value={mission.rewardXp}
                    onChange={(event) => setMission({ ...mission, rewardXp: event.target.value })}
                  />
                </label>
                <label>
                  Moedas maximas
                  <input
                    type="number"
                    min="0"
                    value={mission.rewardCoins}
                    onChange={(event) => setMission({ ...mission, rewardCoins: event.target.value })}
                  />
                </label>
                <label>
                  Tempo estimado (min)
                  <input
                    type="number"
                    min="0"
                    value={mission.targetMinutes}
                    onChange={(event) => setMission({ ...mission, targetMinutes: event.target.value })}
                  />
                </label>
                <label>
                  Status
                  <select value={mission.status} onChange={(event) => setMission({ ...mission, status: event.target.value })}>
                    <option value="open">Aberta</option>
                    <option value="closed">Fechada</option>
                  </select>
                </label>
                <label>
                  Inicio
                  <input
                    type="date"
                    value={mission.startsAt}
                    onChange={(event) => setMission({ ...mission, startsAt: event.target.value })}
                  />
                </label>
                <label>
                  Finalizacao
                  <input
                    type="date"
                    value={mission.endsAt}
                    onChange={(event) => setMission({ ...mission, endsAt: event.target.value })}
                  />
                </label>
              </div>

              <div className="mission-builder">
                <section className="question-bank" aria-label="Banco de questoes">
                  <div className="builder-heading">
                    <strong>Banco de questoes</strong>
                    <span>{activeQuestions.length} ativas</span>
                  </div>
                  <div className="question-filters">
                    <label>
                      Assunto
                      <select
                        value={questionFilters.area}
                        onChange={(event) => setQuestionFilters({ ...questionFilters, area: event.target.value })}
                      >
                        <option value="">Todos</option>
                        {areas.map((area) => <option value={area} key={area}>{area}</option>)}
                      </select>
                    </label>
                    <label>
                      Nivel
                      <select
                        value={questionFilters.difficulty}
                        onChange={(event) => setQuestionFilters({ ...questionFilters, difficulty: event.target.value })}
                      >
                        <option value="">Todos</option>
                        {difficulties.map((difficulty) => <option value={difficulty} key={difficulty}>{difficulty}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="draggable-list">
                    {activeQuestions.map((item) => (
                      <article
                        className={`draggable-question ${mission.questionIds.includes(item.id) ? "is-selected" : ""}`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/question-id", item.id);
                          setDraggingQuestionId(item.id);
                        }}
                        onDragEnd={() => {
                          setDraggingQuestionId("");
                          setDropActive(false);
                        }}
                        key={item.id}
                      >
                        <GripVertical size={18} />
                        <div>
                          <span>{item.area} · {item.difficulty} · +{item.xp} XP</span>
                          <strong>{item.statement}</strong>
                        </div>
                        <button type="button" className="secondary mini-button" onClick={() => addMissionQuestion(item.id)}>
                          Add
                        </button>
                      </article>
                    ))}
                  </div>
                </section>

                <section
                  className={`mission-dropzone ${dropActive ? "is-active" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropActive(true);
                  }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={handleDrop}
                  aria-label="Questoes escolhidas para a missao"
                >
                  <div className="builder-heading">
                    <strong>Missoes</strong>
                    <span>{selectedQuestions.length} fases escolhidas</span>
                  </div>
                  {!selectedQuestions.length && (
                    <div className="drop-hint">
                      <RadioTower size={32} />
                      <p>Arraste questoes para ca para criar a missao semanal.</p>
                    </div>
                  )}
                  <div className="selected-question-list">
                    {selectedQuestions.map((item, index) => (
                      <article className="selected-question" key={item.id}>
                        <b>{index + 1}</b>
                        <div>
                          <span>{item.area} · {item.difficulty}</span>
                          <strong>{item.statement}</strong>
                        </div>
                        <button type="button" className="icon-button danger" onClick={() => removeMissionQuestion(item.id)} aria-label="Remover questao">
                          <Trash2 size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <button type="submit" disabled={!mission.questionIds.length}>
                Criar missao com {mission.questionIds.length} questoes
              </button>
            </form>
          </section>

          <section className="admin-section">
            <h3>Missoes cadastradas</h3>
            <div className="admin-mission-grid">
              {missions.map((item) => (
                <article className="mission-card tcg-mission-card admin-mission-card" key={`${item.id}-card`}>
                  <div className="mission-orbit" />
                  {editingMission?.id === item.id ? (
                    <form className="mission-edit-form" onSubmit={handleSaveMissionEdit}>
                      <label>
                        Titulo
                        <input value={editingMission.title} onChange={(event) => setEditingMission({ ...editingMission, title: event.target.value })} required />
                      </label>
                      <label>
                        Descricao
                        <input value={editingMission.description} onChange={(event) => setEditingMission({ ...editingMission, description: event.target.value })} required />
                      </label>
                      <div className="form-grid">
                        <label>
                          Serie
                          <select value={editingMission.targetGrade} onChange={(event) => setEditingMission({ ...editingMission, targetGrade: event.target.value })}>
                            {gradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
                          </select>
                        </label>
                        <label>
                          Turma
                          <select value={editingMission.targetClass} onChange={(event) => setEditingMission({ ...editingMission, targetClass: event.target.value })}>
                            {classOptions.map((className) => <option value={className} key={className}>{className}</option>)}
                          </select>
                        </label>
                        <label>
                          XP bonus
                          <input type="number" min="0" value={editingMission.rewardXp} onChange={(event) => setEditingMission({ ...editingMission, rewardXp: event.target.value })} />
                        </label>
                        <label>
                          Moedas
                          <input type="number" min="0" value={editingMission.rewardCoins} onChange={(event) => setEditingMission({ ...editingMission, rewardCoins: event.target.value })} />
                        </label>
                        <label>
                          Tempo estimado (min)
                          <input type="number" min="0" value={editingMission.targetMinutes} onChange={(event) => setEditingMission({ ...editingMission, targetMinutes: event.target.value })} />
                        </label>
                        <label>
                          Inicio
                          <input type="date" value={editingMission.startsAt} onChange={(event) => setEditingMission({ ...editingMission, startsAt: event.target.value })} />
                        </label>
                        <label>
                          Finalizacao
                          <input type="date" value={editingMission.endsAt} onChange={(event) => setEditingMission({ ...editingMission, endsAt: event.target.value })} />
                        </label>
                        <label>
                          Status
                          <select value={editingMission.status} onChange={(event) => setEditingMission({ ...editingMission, status: event.target.value })}>
                            <option value="open">Aberta</option>
                            <option value="closed">Fechada</option>
                          </select>
                        </label>
                      </div>
                      <div className="row-actions">
                        <button type="submit">Salvar missao</button>
                        <button type="button" className="secondary" onClick={() => setEditingMission(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="eyebrow">{item.targetGrade} · {item.targetClass}</p>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <div className="mission-stats">
                        <span><Target size={16} /> {item.questionIds?.length || 0} fases</span>
                        <span>{item.status === "open" ? "Aberta" : "Fechada"}</span>
                        <span>{formatMissionPeriod(item)}</span>
                        <span>{item.targetMinutes || 0} min estimados</span>
                        <strong>+{item.rewardXp || 0} XP</strong>
                        <strong>+{item.rewardCoins || 0} moedas</strong>
                      </div>
                      <div className="row-actions">
                        <button type="button" className="secondary" onClick={() => startEditMission(item)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMission(item.id, { status: item.status === "open" ? "closed" : "open" }).then(refresh)}
                        >
                          {item.status === "open" ? "Fechar" : "Abrir"}
                        </button>
                        <button type="button" className="danger-button" onClick={() => handleDeleteMission(item.id)}>
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>

            {false && (
            <div className="table-list">
              {missions.map((item) => (
                <article className="table-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.targetGrade} · {item.targetClass} · {item.questionIds?.length || 0} questoes · {item.status} · {item.rewardCoins || 0} moedas
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateMission(item.id, { status: item.status === "open" ? "closed" : "open" }).then(refresh)}
                  >
                    {item.status === "open" ? "Fechar" : "Abrir"}
                  </button>
                </article>
              ))}
            </div>
            )}
          </section>
        </>
      )}

      {activeTab === "questions" && (
        <>
          <section className="admin-section">
            <h3>Nova questao</h3>
            <form className="admin-form" onSubmit={handleCreateQuestion}>
              <label>
                Enunciado
                <textarea value={question.statement} onChange={(event) => setQuestion({ ...question, statement: event.target.value })} required />
              </label>
              {question.alternatives.map((alternative, index) => (
                <div className="alternative-editor" key={index}>
                  <label>
                    Alternativa {String.fromCharCode(65 + index)}
                    <input
                      value={alternative}
                      onChange={(event) => {
                        const alternatives = [...question.alternatives];
                        alternatives[index] = event.target.value;
                        setQuestion({ ...question, alternatives });
                      }}
                      required
                    />
                  </label>
                  <label className="correct-check">
                    <input
                      type="checkbox"
                      checked={Number(question.correctIndex) === index}
                      onChange={() => setQuestion({ ...question, correctIndex: index })}
                    />
                    Correta
                  </label>
                </div>
              ))}
              <div className="form-grid">
                <label>
                  Area
                  <select value={question.area} onChange={(event) => setQuestion({ ...question, area: event.target.value })}>
                    {areas.map((area) => <option key={area}>{area}</option>)}
                  </select>
                </label>
                <label>
                  Dificuldade
                  <select value={question.difficulty} onChange={(event) => setQuestion({ ...question, difficulty: event.target.value })}>
                    {difficulties.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
                  </select>
                </label>
                <label>
                  XP
                  <input type="number" min="0" value={question.xp} onChange={(event) => setQuestion({ ...question, xp: event.target.value })} />
                </label>
              </div>
              <label>
                Explicacao
                <textarea value={question.explanation} onChange={(event) => setQuestion({ ...question, explanation: event.target.value })} required />
              </label>
              <button type="submit">Criar questao</button>
            </form>
          </section>

          <section className="admin-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Banco</p>
                <h3>Questoes cadastradas</h3>
              </div>
              <span>{filteredQuestions.length} encontradas</span>
            </div>
            <div className="question-filters wide">
              <label>
                Assunto
                <select
                  value={questionFilters.area}
                  onChange={(event) => setQuestionFilters({ ...questionFilters, area: event.target.value })}
                >
                  <option value="">Todos</option>
                  {areas.map((area) => <option value={area} key={area}>{area}</option>)}
                </select>
              </label>
              <label>
                Nivel
                <select
                  value={questionFilters.difficulty}
                  onChange={(event) => setQuestionFilters({ ...questionFilters, difficulty: event.target.value })}
                >
                  <option value="">Todos</option>
                  {difficulties.map((difficulty) => <option value={difficulty} key={difficulty}>{difficulty}</option>)}
                </select>
              </label>
            </div>
            <div className="question-admin-list">
              {filteredQuestions.map((item) => (
                <article className="question-admin-card" key={item.id}>
                  {editingQuestion?.id === item.id ? (
                    <form className="question-edit-form" onSubmit={handleSaveQuestionEdit}>
                      <label>
                        Enunciado
                        <textarea
                          value={editingQuestion.statement}
                          onChange={(event) => setEditingQuestion({ ...editingQuestion, statement: event.target.value })}
                          required
                        />
                      </label>
                      {editingQuestion.alternatives.map((alternative, index) => (
                        <div className="alternative-editor" key={index}>
                          <label>
                            Alternativa {String.fromCharCode(65 + index)}
                            <input
                              value={alternative}
                              onChange={(event) => {
                                const alternatives = [...editingQuestion.alternatives];
                                alternatives[index] = event.target.value;
                                setEditingQuestion({ ...editingQuestion, alternatives });
                              }}
                              required
                            />
                          </label>
                          <label className="correct-check">
                            <input
                              type="checkbox"
                              checked={Number(editingQuestion.correctIndex) === index}
                              onChange={() => setEditingQuestion({ ...editingQuestion, correctIndex: index })}
                            />
                            Correta
                          </label>
                        </div>
                      ))}
                      <div className="form-grid">
                        <label>
                          Area
                          <select
                            value={editingQuestion.area}
                            onChange={(event) => setEditingQuestion({ ...editingQuestion, area: event.target.value })}
                          >
                            {areas.map((area) => <option key={area}>{area}</option>)}
                          </select>
                        </label>
                        <label>
                          Dificuldade
                          <select
                            value={editingQuestion.difficulty}
                            onChange={(event) => setEditingQuestion({ ...editingQuestion, difficulty: event.target.value })}
                          >
                            {difficulties.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
                          </select>
                        </label>
                        <label>
                          XP
                          <input
                            type="number"
                            min="0"
                            value={editingQuestion.xp}
                            onChange={(event) => setEditingQuestion({ ...editingQuestion, xp: event.target.value })}
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={editingQuestion.active ? "active" : "inactive"}
                            onChange={(event) => setEditingQuestion({ ...editingQuestion, active: event.target.value === "active" })}
                          >
                            <option value="active">Ativa</option>
                            <option value="inactive">Inativa</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        Explicacao
                        <textarea
                          value={editingQuestion.explanation}
                          onChange={(event) => setEditingQuestion({ ...editingQuestion, explanation: event.target.value })}
                          required
                        />
                      </label>
                      <div className="row-actions">
                        <button type="submit">Salvar correcao</button>
                        <button type="button" className="secondary" onClick={() => setEditingQuestion(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <span>{item.area} · {item.difficulty} · +{item.xp} XP</span>
                        <strong>{item.statement}</strong>
                        <small>{item.active !== false ? "ativa" : "inativa"}</small>
                      </div>
                      <div className="row-actions">
                        <button type="button" className="secondary" onClick={() => startEditQuestion(item)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => updateQuestion(item.id, { active: item.active === false }).then(refresh)}>
                          {item.active !== false ? "Desativar" : "Ativar"}
                        </button>
                        <button type="button" className="danger-button" onClick={() => handleDeleteQuestion(item.id)}>
                          Apagar
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === "classes" && (
        <section className="admin-section class-management">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Turmas</p>
              <h3>Organizacao por turma</h3>
            </div>
            <Users size={26} />
          </div>

          <div className="class-filter-cards class-management-cards">
            <button
              type="button"
              className={`pending-class-card ${isPendingClassView ? "active" : ""}`}
              onClick={() => {
                setClassFilters({ grade: "__pending__", className: "" });
                setEditingUser(null);
                setRewardingUser(null);
                setStudentSearch("");
                setClassMessage("");
              }}
            >
              <strong>Alunos pendentes</strong>
              <span>{pendingStudents.length} aguardando aprovacao e organizacao de turma</span>
            </button>
            <button
              type="button"
              className={`pending-class-card ${isUnassignedClassView ? "active" : ""}`}
              onClick={() => {
                setClassFilters({ grade: UNASSIGNED_CLASS_KEY, className: "" });
                setEditingUser(null);
                setRewardingUser(null);
                setStudentSearch("");
                setClassMessage("");
              }}
            >
              <strong>Sem turma definida</strong>
              <span>{unassignedUsers.length} usuario(s), incluindo ADMs, precisam de serie/turma ou revisao</span>
            </button>
            {classStats.map((group) => {
              const active = classFilters.grade === group.grade && classFilters.className === group.className;
              return (
                <button
                  type="button"
                  className={active ? "active" : ""}
                  key={`${group.key}-manage`}
                  onClick={() => {
                    setClassFilters({ grade: group.grade, className: group.className });
                    setEditingUser(null);
                    setRewardingUser(null);
                    setStudentSearch("");
                    setClassMessage("");
                  }}
                >
                  <strong>{group.key}</strong>
                  <span>{group.students} alunos · {group.approvedStudents} aprovados · {group.accuracy}% acerto</span>
                </button>
              );
            })}
          </div>

          {!selectedClassStats && (
            <p className="muted">Selecione uma turma, pendentes ou sem turma definida para gerenciar os usuarios.</p>
          )}

          {selectedClassStats && (
            <div className="class-detail-panel">
              <div className="analytics-focus">
                <div>
                  <p className="eyebrow">Turma selecionada</p>
                  <h4>{selectedClassStats.key}</h4>
                  {selectedClassStats.isPending ? (
                    <span>{selectedClassStats.students} alunos aguardando aprovacao. Edite serie/turma antes de liberar o acesso.</span>
                  ) : selectedClassStats.isUnassigned ? (
                    <span>{selectedClassStats.students} usuario(s) sem alocacao completa. Aqui tambem aparecem administradores para revisao.</span>
                  ) : (
                  <span>
                    {selectedClassStats.students} alunos · {selectedClassStats.solved} respostas · {selectedClassStats.accuracy}% acerto · {selectedClassStats.participation}% participacao
                  </span>
                  )}
                </div>
                <button type="button" className="secondary" onClick={() => setClassFilters({ grade: "", className: "" })}>
                  Fechar
                </button>
              </div>

              <div className="class-detail-grid">
                <section className="analytics-panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Alunos</p>
                      <h3>{classStudents.length} cadastrados</h3>
                    </div>
                  </div>

                  <div className="student-search-row">
                    <label>
                      Localizar aluno
                      <input
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Buscar por nome, e-mail, serie ou turma"
                      />
                    </label>
                    {studentSearch && (
                      <button type="button" className="secondary" onClick={() => setStudentSearch("")}>
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="student-management-list">
                    {classStudents.map((user) => {
                      const solved = Number(user.solvedCount || 0);
                      const correct = Number(user.correctCount || 0);
                      const accuracy = solved ? Math.round((correct / solved) * 100) : 0;
                      const xp = Number(user.totalXp || 0);
                      const cardRank = xp >= 500 ? "Raro" : xp >= 200 ? "Incomum" : "Comum";
                      return (
                      <article className={`student-management-card tcg-student-card status-${user.status || "pending"}`} key={user.id}>
                        {editingUser?.id === user.id ? (
                          <form className="student-edit-form" onSubmit={handleSaveUserEdit}>
                            <label>
                              Nome
                              <input value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} />
                            </label>
                            <label>
                              E-mail cadastral
                              <input type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} />
                            </label>
                            <div className="class-editor">
                              <label>
                                Serie
                                <select value={editingUser.grade} onChange={(event) => setEditingUser({ ...editingUser, grade: event.target.value })}>
                                  {gradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
                                </select>
                              </label>
                              <label>
                                Turma
                                <select value={editingUser.className} onChange={(event) => setEditingUser({ ...editingUser, className: event.target.value })}>
                                  {classOptions.map((className) => <option value={className} key={className}>{className}</option>)}
                                </select>
                              </label>
                            </div>
                            <label>
                              Status
                              <select value={editingUser.status} onChange={(event) => setEditingUser({ ...editingUser, status: event.target.value })}>
                                <option value="pending">Pendente</option>
                                <option value="approved">Aprovado</option>
                                <option value="rejected">Rejeitado</option>
                              </select>
                            </label>
                            <p className="muted">Alterar este e-mail atualiza o cadastro no Firestore. O e-mail de login do Firebase Auth precisa de Admin SDK/Cloud Function.</p>
                            <div className="row-actions">
                              <button type="submit">Salvar aluno</button>
                              <button type="button" className="secondary" onClick={() => setEditingUser(null)}>
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="tcg-card-top">
                              <div>
                                <span>{cardRank}</span>
                                <strong>{user.name || user.email}</strong>
                              </div>
                              <b>{user.status || "pending"}</b>
                            </div>
                            <div className="tcg-card-body">
                              <div className="tcg-avatar-mark">
                                <AvatarPreview avatar={user.avatar} size={56} />
                              </div>
                              <div className="tcg-student-meta">
                                <span>{user.email}</span>
                                <small>{user.grade || "sem serie"} / {user.className || "sem turma"}</small>
                              </div>
                            </div>
                            <div className="tcg-stat-grid">
                              <div>
                                <span>XP</span>
                                <strong>{xp}</strong>
                              </div>
                              <div>
                                <span>Acerto</span>
                                <strong>{accuracy}%</strong>
                              </div>
                              <div>
                                <span>Resp.</span>
                                <strong>{solved}</strong>
                              </div>
                              <div>
                                <span>Streak</span>
                                <strong>{user.bestStreak || 0}</strong>
                              </div>
                            </div>
                            <div className="tcg-progress-lines">
                              <label>
                                Precisao
                                <span><i style={{ width: `${Math.max(4, accuracy)}%` }} /></span>
                              </label>
                              <label>
                                Participacao
                                <span><i style={{ width: `${Math.min(100, Math.max(4, solved * 4))}%` }} /></span>
                              </label>
                            </div>
                            <div className="row-actions">
                              <button type="button" className="secondary" onClick={() => startEditUser(user)}>
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setRewardingUser({ id: user.id, name: user.name || user.email, xp: 10, coins: 10 })}
                              >
                                Premiar
                              </button>
                              <button type="button" onClick={() => approveUser(user.id, {
                                grade: gradeOptions.includes(user.grade)
                                  ? user.grade
                                  : selectedClassStats.isPending || selectedClassStats.isUnassigned ? "1 ano" : selectedClassStats.grade,
                                className: classOptions.includes(user.className)
                                  ? user.className
                                  : selectedClassStats.isPending || selectedClassStats.isUnassigned ? "A" : selectedClassStats.className
                              }).then(refresh)}>
                                {user.status === "approved" ? "Alocar padrao" : "Aprovar"}
                              </button>
                              <button type="button" className="secondary" onClick={() => handlePasswordReset(user)}>
                                Redefinir senha
                              </button>
                              <button type="button" className="danger-button" onClick={() => handleDeleteUser(user)}>
                                Excluir
                              </button>
                            </div>
                            {rewardingUser?.id === user.id && (
                              <form className="student-reward-form" onSubmit={handleAwardUser}>
                                <div>
                                  <label>
                                    XP
                                    <input
                                      type="number"
                                      min="0"
                                      value={rewardingUser.xp}
                                      onChange={(event) => setRewardingUser({ ...rewardingUser, xp: event.target.value })}
                                    />
                                  </label>
                                  <label>
                                    Moedas
                                    <input
                                      type="number"
                                      min="0"
                                      value={rewardingUser.coins}
                                      onChange={(event) => setRewardingUser({ ...rewardingUser, coins: event.target.value })}
                                    />
                                  </label>
                                </div>
                                <small>Use para atividade offline, questao no quadro ou participacao em sala.</small>
                                <div className="row-actions">
                                  <button type="submit">Aplicar premio</button>
                                  <button type="button" className="secondary" onClick={() => setRewardingUser(null)}>
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            )}
                          </>
                        )}
                      </article>
                      );
                    })}
                  </div>
                </section>

                {!selectedClassStats.isPending && !selectedClassStats.isUnassigned && (
                <section className="analytics-panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Missoes</p>
                      <h3>Abertas</h3>
                    </div>
                  </div>
                  <div className="class-mission-list">
                    {openClassMissions.map((item) => (
                      <article key={item.id}>
                        <strong>{item.title}</strong>
                        <span>{item.questionIds?.length || 0} questoes · {item.rewardXp || 0} XP · {item.rewardCoins || 0} moedas</span>
                        <small>{item.attempts} conclusoes · {item.accuracy}% acerto</small>
                      </article>
                    ))}
                    {!openClassMissions.length && <p className="muted">Nenhuma missao aberta para esta turma.</p>}
                  </div>

                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Historico</p>
                      <h3>Fechadas ou concluidas</h3>
                    </div>
                  </div>
                  <div className="class-mission-list">
                    {closedClassMissions.map((item) => (
                      <article key={item.id}>
                        <strong>{item.title}</strong>
                        <span>{item.status} · {item.attempts} conclusoes · {item.accuracy}% acerto</span>
                        <small>{formatMissionPeriod(item)}</small>
                      </article>
                    ))}
                    {!closedClassMissions.length && <p className="muted">Nenhuma missao fechada ainda.</p>}
                  </div>
                </section>
                )}
              </div>

              {classMessage && <p className="muted">{classMessage}</p>}
            </div>
          )}
        </section>
      )}

      {false && activeTab === "classes" && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Turmas</p>
              <h3>Usuarios cadastrados</h3>
            </div>
            <Users size={26} />
          </div>
          <div className="table-list">
            {users.map((user) => (
              <article className="table-row user-row" key={user.id}>
                <div>
                  <strong>{user.name || user.email}</strong>
                  <span>{user.email} · {user.status} · {user.role} · {user.grade || "sem serie"} / {user.className || "sem turma"}</span>
                </div>
                <div className="class-editor">
                  <select
                    aria-label="Serie"
                    value={gradeOptions.includes(user.grade) ? user.grade : ""}
                    onChange={(event) => updateUserClass(user.id, {
                      grade: event.target.value,
                      className: classOptions.includes(user.className) ? user.className : "A"
                    }).then(refresh)}
                  >
                    <option value="">Serie</option>
                    {gradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
                  </select>
                  <select
                    aria-label="Turma"
                    value={classOptions.includes(user.className) ? user.className : ""}
                    onChange={(event) => updateUserClass(user.id, {
                      grade: gradeOptions.includes(user.grade) ? user.grade : "1 ano",
                      className: event.target.value
                    }).then(refresh)}
                  >
                    <option value="">Turma</option>
                    {classOptions.map((className) => <option value={className} key={className}>{className}</option>)}
                  </select>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => approveUser(user.id, {
                    grade: gradeOptions.includes(user.grade) ? user.grade : "1 ano",
                    className: classOptions.includes(user.className) ? user.className : "A"
                  }).then(refresh)}>
                    Aprovar
                  </button>
                  <button type="button" className="secondary" onClick={() => rejectUser(user.id).then(refresh)}>
                    Rejeitar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "creations" && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Oficina dos alunos</p>
              <h3>Pedidos de acessorios</h3>
              <span>Avalie, leve para votacao ou publique direto na loja com preco definido.</span>
            </div>
            <Palette size={26} />
          </div>

          {editingAccessoryArt && (
            <form className="accessory-art-editor-panel" onSubmit={handleAccessoryArtSave}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Edicao de arte</p>
                  <h3>{editingAccessoryArt.title || "Criacao sem titulo"}</h3>
                  <span>
                    {editingAccessoryArt.duplicatedFromId
                      ? "Edite esta variacao e crie um novo pedido no catalogo, sem alterar a arte original."
                      : "Corrija a arte original ou crie uma copia nova para reaproveitar o modelo com seguranca."}
                  </span>
                </div>
                <Palette size={24} />
              </div>
              <PixelAccessoryEditor
                key={editingAccessoryArt.id}
                onPixelDataChange={setEditingAccessoryPixelData}
                storageKey=""
                showGuide={editingArtUsesGuide}
                guideSrc={editingArtUsesGuide ? adminGuideBaseSrc : ""}
                initialPixelData={editingAccessoryArt.pixelData || null}
              />
              {editingAccessoryArt.duplicatedFromId && (
                <p className="muted">
                  Modo copia: ao confirmar, um novo pedido sera criado no Firebase. A arte original fica preservada.
                </p>
              )}
              <div className="accessory-art-editor-actions">
                {!editingAccessoryArt.duplicatedFromId && (
                  <button
                    type="submit"
                    className="art-save-original-button"
                    disabled={savingAccessoryArt || !editingAccessoryPixelData}
                  >
                    {savingAccessoryArt ? "Salvando..." : "Salvar na arte original"}
                  </button>
                )}
                <button
                  type="button"
                  className="art-create-copy-button"
                  disabled={savingAccessoryArt || !editingAccessoryPixelData}
                  onClick={handleAccessoryArtCreateCopy}
                >
                  {savingAccessoryArt ? "Criando..." : "Criar nova copia"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditingAccessoryArt(null);
                    setEditingAccessoryPixelData(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="accessory-request-grid">
            {accessoryRequests.map((item) => {
              const previewSrc = getAccessoryPreviewSrc(item);
              const selectedShopCategory = accessoryShopCategories[item.id] || item.shopCategoryKey || item.category || "accessories";
              return (
              <article className={`accessory-request-card status-${item.status || "pending"}`} key={item.id}>
                <div className="accessory-card-top">
                  <span>{item.status || "pending"}</span>
                  <b>{item.grade || "sem serie"} / {item.className || "sem turma"}</b>
                </div>
                <div className="accessory-request-image">
                  {previewSrc ? <img src={previewSrc} alt={item.title || "Acessorio criado"} /> : <span>Sem imagem</span>}
                </div>
                <div className="accessory-request-body">
                  <div>
                    <span>{item.status || "pending"} · {item.grade || "sem serie"} / {item.className || "sem turma"}</span>
                    <strong>{item.title || "Sem titulo"}</strong>
                    <small>{item.userName || item.userEmail || "Aluno"} · {item.pricePaid || 0} moedas pagas</small>
                  </div>
                  <label className="accessory-title-edit">
                    Nome do item
                    <div>
                      <input
                        value={accessoryTitles[item.id] ?? item.title ?? ""}
                        onChange={(event) => setAccessoryTitles((current) => ({
                          ...current,
                          [item.id]: event.target.value
                        }))}
                        maxLength={48}
                      />
                      <button type="button" className="secondary" onClick={() => handleAccessoryTitleSave(item)}>
                        Salvar
                      </button>
                    </div>
                  </label>
                  {item.description && <p>{item.description}</p>}
                  <label className="accessory-shop-price">
                    Status
                    <select
                      value={item.status || "pending"}
                      onChange={(event) => handleAccessoryStatus(item, event.target.value)}
                    >
                      <option value="pending">Pendente</option>
                      <option value="voting">Votacao</option>
                      <option value="approved">Aprovado</option>
                      <option value="listed">Na loja</option>
                      <option value="rejected">Rejeitado</option>
                    </select>
                  </label>
                  <label className="accessory-shop-price">
                    Preco na loja
                    <input
                      type="number"
                      min="0"
                      value={selectedShopCategory === "base" ? 0 : accessoryShopPrices[item.id] ?? item.shopPrice ?? economyConfig.avatarItemPrice ?? defaultEconomyConfig.avatarItemPrice}
                      disabled={selectedShopCategory === "base"}
                      onChange={(event) => setAccessoryShopPrices((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))}
                    />
                  </label>
                  <label className="accessory-shop-price">
                    Categoria
                    <select
                      value={selectedShopCategory}
                      onChange={(event) => setAccessoryShopCategories((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))}
                    >
                      <option value="base">Base</option>
                      <option value="hair">Cabelo</option>
                      <option value="shirts">Camisa</option>
                      <option value="eyes">Olhos</option>
                      <option value="mouths">Boca</option>
                      <option value="accessories">Acessorio</option>
                      <option value="pants">Calca</option>
                      <option value="pets">Pet</option>
                      <option value="emojis">Emoji</option>
                    </select>
                  </label>
                  <div className="row-actions">
                    <button type="button" className="secondary" onClick={() => downloadAccessoryRequest(item)}>
                      <Download size={16} />
                      Baixar PNG
                    </button>
                    <button type="button" className="secondary" onClick={() => handleAccessoryArtEdit(item)} disabled={!item.pixelData}>
                      Editar arte
                    </button>
                    <button type="button" className="secondary" onClick={() => handleAccessoryArtDuplicate(item)} disabled={!item.pixelData}>
                      Duplicar e editar
                    </button>
                    <button type="button" onClick={() => handleAccessoryStatus(item, "voting")}>
                      Votacao
                    </button>
                    {item.status === "listed" ? (
                      <button type="button" onClick={() => handleAccessoryStatus(item, "approved")}>
                        Tirar da loja
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleAccessoryPublish(item)}>
                        Aprovar
                      </button>
                    )}
                    <button type="button" className="danger-button" onClick={() => handleAccessoryStatus(item, "rejected")}>
                      Rejeitar
                    </button>
                    <button type="button" className="danger-button" onClick={() => handleAccessoryDelete(item)}>
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
            {!accessoryRequests.length && <p className="muted">Nenhuma criacao enviada ainda.</p>}
          </div>
        </section>
      )}

      {activeTab === "finance" && (
        <section className="admin-section finance-admin-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Controle financeiro</p>
              <h3>Custos de moedas do sistema</h3>
              <span>Ajuste a economia conforme a resposta da turma e o ritmo das atividades.</span>
            </div>
            <CircleDollarSign size={26} />
          </div>

          <form className="admin-form" onSubmit={handleSaveEconomyConfig}>
            <div className="finance-control-grid">
              <label>
                Preco padrao de itens
                <input
                  type="number"
                  min="0"
                  value={economyConfig.avatarItemPrice}
                  onChange={(event) => setEconomyConfig((current) => ({ ...current, avatarItemPrice: event.target.value }))}
                />
                <small>Usado como valor inicial quando o professor publica uma criacao na loja.</small>
              </label>
              <label>
                Criar item ou emoji
                <input
                  type="number"
                  min="0"
                  value={economyConfig.customCreationPrice}
                  onChange={(event) => setEconomyConfig((current) => ({ ...current, customCreationPrice: event.target.value }))}
                />
                <small>Cobrado quando o aluno envia uma criacao para avaliacao.</small>
              </label>
              <label>
                Enviar emoji
                <input
                  type="number"
                  min="0"
                  value={economyConfig.emojiSendPrice}
                  onChange={(event) => setEconomyConfig((current) => ({ ...current, emojiSendPrice: event.target.value }))}
                />
                <small>Cobrado a cada interacao enviada para um colega.</small>
              </label>
              <label>
                Preco de espaco extra na Vitrine
                <input
                  type="number"
                  min="0"
                  value={economyConfig.showcaseSlotPrice}
                  onChange={(event) => setEconomyConfig((current) => ({ ...current, showcaseSlotPrice: event.target.value }))}
                />
                <small>Cobrado quando o aluno compra outro manequim permanente.</small>
              </label>
            </div>
            <button type="submit">Salvar economia</button>
          </form>

          {economyMessage && <p className="muted">{economyMessage}</p>}
        </section>
      )}

      {activeTab === "social" && (
        <section className="admin-section social-admin-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Interacoes sociais</p>
              <h3>Controle de visibilidade entre estudantes</h3>
              <span>Defina o alcance do painel Colegas para atividades sociais e envio de emojis.</span>
            </div>
            <Share2 size={26} />
          </div>

          <form className="admin-form" onSubmit={handleSaveSocialConfig}>
            <label>
              Quem pode aparecer para os alunos
              <select
                value={socialConfig.visibilityScope || "class"}
                onChange={(event) => setSocialConfig({ ...socialConfig, visibilityScope: event.target.value })}
              >
                {socialVisibilityOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="social-scope-preview">
              <article>
                <strong>Apenas turma</strong>
                <span>O aluno ve somente colegas do mesmo ano e turma.</span>
              </article>
              <article>
                <strong>Toda a serie</strong>
                <span>O aluno ve estudantes do mesmo ano, em qualquer turma.</span>
              </article>
              <article>
                <strong>Todos</strong>
                <span>Todos os estudantes aprovados aparecem no painel.</span>
              </article>
            </div>
            <button type="submit">Salvar configuracao social</button>
          </form>

          {socialMessage && <p className="muted">{socialMessage}</p>}
        </section>
      )}

      {activeTab === "analytics" && (
        <section className="admin-section analytics-dashboard">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Desempenho pedagogico por turma</h3>
            </div>
            <BarChart3 size={26} />
          </div>

          <div className="analytics-filters">
            <label>
              Serie
              <select
                value={analyticsFilters.grade}
                onChange={(event) => setAnalyticsFilters((current) => ({ ...current, grade: event.target.value }))}
              >
                <option value="">Todas</option>
                {gradeOptions.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
              </select>
            </label>
            <label>
              Turma
              <select
                value={analyticsFilters.className}
                onChange={(event) => setAnalyticsFilters((current) => ({ ...current, className: event.target.value }))}
              >
                <option value="">Todas</option>
                {classOptions.map((className) => <option value={className} key={className}>{className}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="secondary"
              onClick={() => setAnalyticsFilters({ grade: "", className: "" })}
            >
              Limpar filtros
            </button>
          </div>

          <div className="class-filter-cards">
            {classStats.map((group) => {
              const active = analyticsFilters.grade === group.grade && analyticsFilters.className === group.className;
              return (
                <button
                  type="button"
                  className={active ? "active" : ""}
                  key={`${group.key}-filter`}
                  onClick={() => setAnalyticsFilters({ grade: group.grade, className: group.className })}
                >
                  <strong>{group.key}</strong>
                  <span>{group.students} alunos · {group.accuracy}% acerto · {group.solved} respostas</span>
                </button>
              );
            })}
          </div>

          <div className="analytics-kpi-grid">
            <article>
              <Users size={22} />
              <span>Alunos</span>
              <strong>{analyticsSummary.students}</strong>
              <small>{analyticsSummary.approvedStudents} aprovados em {analyticsSummary.classes} turmas</small>
            </article>
            <article>
              <Target size={22} />
              <span>Taxa de acerto</span>
              <strong>{analyticsSummary.accuracy}%</strong>
              <small>{analyticsSummary.correct}/{analyticsSummary.solved} respostas corretas</small>
            </article>
            <article>
              <Activity size={22} />
              <span>Participacao</span>
              <strong>{analyticsSummary.participation}%</strong>
              <small>{analyticsSummary.activeStudents} alunos com respostas</small>
            </article>
            <article>
              <TrendingUp size={22} />
              <span>Media por aluno</span>
              <strong>{analyticsSummary.avgSolved}</strong>
              <small>{analyticsSummary.avgXp} XP medio</small>
            </article>
          </div>

          {selectedClass && (
            <div className="analytics-focus">
              <div>
                <p className="eyebrow">Turma selecionada</p>
                <h4>{selectedClass.key}</h4>
                <span>
                  {selectedClass.students} alunos · {selectedClass.solved} respostas · {selectedClass.accuracy}% acerto · {selectedClass.participation}% participacao
                </span>
              </div>
              <Trophy size={28} />
            </div>
          )}

          <div className="analytics-layout">
            <section className="analytics-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Comparativo</p>
                  <h3>Acerto por turma</h3>
                </div>
              </div>
              <div className="teacher-chart">
                {filteredClassStats.map((group) => (
                  <article className="chart-row" key={group.key}>
                    <div>
                      <strong>{group.key}</strong>
                      <span>{group.students} alunos · {group.solved} respostas · {group.avgSolved} por aluno</span>
                    </div>
                    <div className="chart-track">
                      <i style={{ width: `${Math.max(4, group.accuracy)}%` }} />
                    </div>
                    <b>{group.accuracy}%</b>
                  </article>
                ))}
                {!filteredClassStats.length && <p className="muted">Sem dados para os filtros selecionados.</p>}
              </div>
            </section>

            <section className="analytics-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Engajamento</p>
                  <h3>Volume de respostas</h3>
                </div>
              </div>
              <div className="teacher-chart">
                {filteredClassStats.map((group) => (
                  <article className="chart-row compact" key={`${group.key}-volume`}>
                    <div>
                      <strong>{group.key}</strong>
                      <span>{group.participation}% participacao · {group.avgXp} XP medio</span>
                    </div>
                    <div className="chart-track volume">
                      <i style={{ width: `${Math.max(4, (group.solved / maxSolved) * 100)}%` }} />
                    </div>
                    <b>{group.solved}</b>
                  </article>
                ))}
                {!filteredClassStats.length && <p className="muted">Sem dados para os filtros selecionados.</p>}
              </div>
            </section>
          </div>

          <section className="analytics-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Evolucao</p>
                <h3>Aprendizagem por missao semanal</h3>
              </div>
              <TrendingUp size={24} />
            </div>
            <p className="analytics-research-note">
              Cada barra representa uma missao concluida pela turma filtrada. A altura principal mostra a taxa de acerto; o volume lateral ajuda a interpretar se a melhora veio com participacao suficiente.
            </p>
            <div className="mission-evolution-chart">
              {missionEvolution.map((item, index) => {
                const previous = missionEvolution[index - 1];
                const delta = previous ? item.accuracy - previous.accuracy : 0;
                return (
                  <article className="mission-evolution-item" key={item.key}>
                    <div className="mission-evolution-bars">
                      <div className="mission-evolution-main-bar" title={`${item.accuracy}% de acerto`}>
                        <span style={{ height: `${Math.max(4, item.accuracy)}%` }} />
                      </div>
                      <div className="mission-evolution-volume-bar" title={`${item.attempts} tentativas`}>
                        <span style={{ height: `${Math.max(4, (item.attempts / maxEvolutionAttempts) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="mission-evolution-info">
                      <strong>{item.title}</strong>
                      <span>{item.period}</span>
                      <b>{item.accuracy}% acerto</b>
                      <small>
                        {item.attempts} tentativas · {item.participants} alunos · XP medio {item.avgXp}
                      </small>
                      {previous && (
                        <em className={delta >= 0 ? "positive" : "negative"}>
                          {delta >= 0 ? "+" : ""}{delta} p.p. vs missao anterior
                        </em>
                      )}
                    </div>
                  </article>
                );
              })}
              {!missionEvolution.length && (
                <p className="muted">Ainda nao ha missoes concluidas para montar a serie historica dos filtros selecionados.</p>
              )}
            </div>
          </section>

          <section className="analytics-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranking</p>
                <h3>Turmas com melhor desempenho</h3>
              </div>
            </div>
            <div className="analytics-ranking">
              {topClasses.map((group, index) => (
                <article key={`${group.key}-rank`}>
                  <strong>{index + 1}</strong>
                  <div>
                    <b>{group.key}</b>
                    <span>{group.accuracy}% acerto · {group.solved} respostas · melhor sequencia {group.bestStreak}</span>
                  </div>
                  <small>{group.avgCoins} moedas medias</small>
                </article>
              ))}
              {!topClasses.length && <p className="muted">Sem ranking disponivel ainda.</p>}
            </div>
          </section>

          <section className="analytics-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Coleta</p>
                <h3>Indicadores prontos para pesquisa</h3>
              </div>
            </div>
            <p className="analytics-research-note">
              Variaveis agregadas por turma para acompanhar desempenho, engajamento e progressao. Use estes indicadores como base para comparacoes entre turmas, ciclos de missao e recortes de intervencao.
            </p>
            <div className="analytics-data-grid">
              {filteredClassStats.map((group) => (
                <article key={`${group.key}-data`}>
                  <div className="research-card-heading">
                    <strong>{group.key}</strong>
                    <span>amostra n={group.students}</span>
                  </div>
                  <div className="research-metric-grid">
                    <div>
                      <small>ACERTO_MEDIO</small>
                      <b>{group.accuracy}%</b>
                      <span>Percentual de respostas corretas.</span>
                    </div>
                    <div>
                      <small>PARTICIPACAO</small>
                      <b>{group.participation}%</b>
                      <span>Alunos com pelo menos uma resposta.</span>
                    </div>
                    <div>
                      <small>RESPOSTAS</small>
                      <b>{group.solved}</b>
                      <span>Total de interacoes registradas.</span>
                    </div>
                    <div>
                      <small>QUESTOES_ALUNO</small>
                      <b>{group.avgSolved}</b>
                      <span>Media de respostas por estudante.</span>
                    </div>
                    <div>
                      <small>XP_MEDIO</small>
                      <b>{group.avgXp}</b>
                      <span>Indicador de progressao gamificada.</span>
                    </div>
                    <div>
                      <small>SEQUENCIA_MAX</small>
                      <b>{group.bestStreak}</b>
                      <span>Maior sequencia observada na turma.</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {false && activeTab === "analytics" && (
        <section className="admin-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Desempenho por turma</h3>
            </div>
            <BarChart3 size={26} />
          </div>
          <div className="teacher-chart">
            {classStats.map((group) => (
              <article className="chart-row" key={group.key}>
                <div>
                  <strong>{group.key}</strong>
                  <span>{group.students} alunos · {group.solved} respostas · {group.accuracy}% acerto · {group.avgXp} XP medio</span>
                </div>
                <div className="chart-track">
                  <i style={{ width: `${Math.max(8, (group.solved / maxSolved) * 100)}%` }} />
                </div>
              </article>
            ))}
            {!classStats.length && <p className="muted">Sem dados de alunos ainda.</p>}
          </div>
        </section>
      )}
    </section>
  );
}
