import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpen, CircleDollarSign, Download, GripVertical, Lock, Palette, RadioTower, Share2, Target, Trash2, TrendingUp, Trophy, Users } from "lucide-react";
import AvatarPreview from "../components/AvatarPreview.jsx";
import ChoicePills from "../components/ChoicePills.jsx";
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
import { deleteWallMessage, listWallMessages, setWallMessageStatus } from "../services/wallService";
import { defaultWeeklyRankingConfig, deleteWeeklyRankingConfig, getWeeklyRankingConfig, saveWeeklyRankingConfig } from "../services/analyticsService";
import {
  buildClassroomOptions,
  classroomKey,
  createClassroom,
  deleteClassroom,
  fallbackClassOptions,
  fallbackGradeOptions,
  listClassrooms
} from "../services/classroomService";
import { getRenderablePixelArtSrc } from "../utils/pixelArt";
import { defaultAvatar, getAvatarOptions, loadAvatarCatalog } from "../services/avatarCatalogService";
import { getLevelInfo } from "../utils/levels";
import { normalizeAvatarLayerOrder } from "../utils/avatarLayers";

const areas = ["Mecanica", "Termologia", "Optica", "Eletricidade", "Ondulatoria", "Fisica Moderna"];
const difficulties = ["facil", "medio", "dificil"];
const defaultGradeOptions = fallbackGradeOptions;
const defaultClassOptions = fallbackClassOptions;
const areaOptions = areas.map((area) => ({ value: area, label: area }));
const areaFilterOptions = [{ value: "", label: "Todos" }, ...areaOptions];
const difficultyOptions = difficulties.map((difficulty) => ({ value: difficulty, label: difficulty }));
const difficultyFilterOptions = [{ value: "", label: "Todos" }, ...difficultyOptions];
const missionStatusOptions = [
  { value: "open", label: "Aberta" },
  { value: "closed", label: "Fechada" }
];
const questionStatusOptions = [
  { value: "active", label: "Ativa" },
  { value: "inactive", label: "Inativa" }
];
const userStatusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovado" },
  { value: "rejected", label: "Rejeitado" }
];
const accessoryStatusOptions = [
  { value: "pending", label: "Pendente" },
  { value: "voting", label: "Votacao" },
  { value: "approved", label: "Aprovado" },
  { value: "listed", label: "Na loja" },
  { value: "rejected", label: "Rejeitado" }
];
const UNASSIGNED_CLASS_KEY = "__unassigned__";
const creationStatusFilters = [
  { value: "review", label: "Para aceitar" },
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "voting", label: "Em votacao" },
  { value: "approved", label: "Aprovados" },
  { value: "listed", label: "Na loja" },
  { value: "rejected", label: "Rejeitados" }
];
const avatarItemCategoryOptions = [
  { value: "base", label: "Base" },
  { value: "hair", label: "Cabelo" },
  { value: "shirts", label: "Camisa" },
  { value: "eyes", label: "Olhos" },
  { value: "mouths", label: "Boca" },
  { value: "accessories", label: "Acessorio" },
  { value: "pants", label: "Calca" },
  { value: "shoes", label: "Sapatos" },
  { value: "pets", label: "Pet" },
  { value: "emojis", label: "Emoji" }
];

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

const initialClassroom = {
  name: "",
  grade: "1 ano",
  className: "A"
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

function buildManagedClassrooms(classrooms, classStats) {
  const groups = new Map();

  classrooms.forEach((classroom) => {
    if (!classroom.grade || !classroom.className) return;
    const key = `${classroom.grade} - ${classroom.className}`;
    groups.set(key, {
      key,
      id: classroom.id,
      grade: classroom.grade,
      className: classroom.className,
      name: classroom.name || key,
      active: classroom.active !== false,
      source: "firebase",
      students: 0,
      approvedStudents: 0,
      solved: 0,
      correct: 0,
      accuracy: 0,
      participation: 0
    });
  });

  classStats.forEach((group) => {
    const current = groups.get(group.key);
    groups.set(group.key, {
      ...group,
      ...current,
      ...group,
      name: current?.name || group.key,
      source: current?.source || "legacy",
      id: current?.id || "",
      active: current?.active ?? true
    });
  });

  return [...groups.values()].sort((a, b) => a.grade.localeCompare(b.grade) || a.className.localeCompare(b.className));
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

function dateFromDateKey(dateKey) {
  if (!dateKey) return null;
  const parsed = new Date(`${dateKey}T12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function getAttemptDate(attempt) {
  const submittedMillis = timestampToMillis(attempt.submittedAt);
  if (submittedMillis) return new Date(submittedMillis);
  return dateFromDateKey(attempt.dateKey);
}

function getCurrentWeekInfo(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const formatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  return {
    start,
    end,
    key: start.toISOString().slice(0, 10),
    label: `${formatter.format(start)} a ${formatter.format(end)}`
  };
}

function buildStudentAnalytics({ users, attempts, filters, weekInfo, attentionThreshold }) {
  const students = users
    .filter((user) => user.role !== "admin" && user.status === "approved")
    .filter((user) => !filters.grade || user.grade === filters.grade)
    .filter((user) => !filters.className || user.className === filters.className);
  const studentMap = new Map(students.map((user) => [user.id, {
    id: user.id,
    name: user.name || user.email || "Aluno",
    email: user.email || "",
    grade: user.grade || "sem serie",
    className: user.className || "sem turma",
    totalXp: Number(user.totalXp || 0),
    level: getLevelInfo(user.totalXp || 0).level,
    avatar: normalizeRankingAvatar(user.avatar),
    coins: Number(user.coins || 0),
    bestStreak: Number(user.bestStreak || 0),
    solved: Number(user.solvedCount || 0),
    correct: Number(user.correctCount || 0),
    missionAttempts: 0,
    missionSolved: 0,
    missionCorrect: 0,
    xpFromMissions: 0,
    coinsFromMissions: 0,
    durationSeconds: 0,
    areas: {},
    weeklyMissions: 0,
    weeklySolved: 0,
    weeklyCorrect: 0,
    weeklyXp: 0,
    weeklyCoins: 0
  }]));

  attempts.forEach((attempt) => {
    if (!attempt.completed || !studentMap.has(attempt.userId)) return;
    const student = studentMap.get(attempt.userId);
    const solved = Number(attempt.solved || 0);
    const correct = Number(attempt.correct || 0);

    student.missionAttempts += 1;
    student.missionSolved += solved;
    student.missionCorrect += correct;
    student.xpFromMissions += Number(attempt.xpEarned || 0);
    student.coinsFromMissions += Number(attempt.coinsEarned || 0);
    student.durationSeconds += Number(attempt.durationSeconds || 0);

    (attempt.answers || []).forEach((answer) => {
      const area = answer.area || "Sem area";
      const current = student.areas[area] || { solved: 0, correct: 0 };
      current.solved += 1;
      current.correct += answer.correct ? 1 : 0;
      student.areas[area] = current;
    });

    const attemptDate = getAttemptDate(attempt);
    if (attemptDate && attemptDate >= weekInfo.start && attemptDate <= weekInfo.end) {
      student.weeklyMissions += 1;
      student.weeklySolved += solved;
      student.weeklyCorrect += correct;
      student.weeklyXp += Number(attempt.xpEarned || 0);
      student.weeklyCoins += Number(attempt.coinsEarned || 0);
    }
  });

  return [...studentMap.values()].map((student) => {
    const areaRows = Object.entries(student.areas)
      .map(([area, stats]) => ({
        area,
        solved: stats.solved,
        accuracy: stats.solved ? Math.round((stats.correct / stats.solved) * 100) : 0
      }))
      .sort((a, b) => b.solved - a.solved || b.accuracy - a.accuracy);
    const weakArea = areaRows.slice().filter((item) => item.solved >= 2 && item.accuracy < attentionThreshold).sort((a, b) => a.accuracy - b.accuracy)[0];
    const strongArea = areaRows.slice().filter((item) => item.solved >= 2 && item.accuracy >= Math.min(100, attentionThreshold + 20)).sort((a, b) => b.accuracy - a.accuracy)[0];

    return {
      ...student,
      accuracy: student.solved ? Math.round((student.correct / student.solved) * 100) : 0,
      missionAccuracy: student.missionSolved ? Math.round((student.missionCorrect / student.missionSolved) * 100) : 0,
      weeklyAccuracy: student.weeklySolved ? Math.round((student.weeklyCorrect / student.weeklySolved) * 100) : 0,
      avgMissionMinutes: student.missionAttempts ? Math.round((student.durationSeconds / student.missionAttempts) / 60) : 0,
      areaRows,
      strongArea,
      weakArea
    };
  });
}

function classifyPerformance(accuracy, threshold) {
  const safeAccuracy = Number(accuracy || 0);
  const safeThreshold = Math.max(0, Math.min(100, Number(threshold || 0)));
  if (safeAccuracy < safeThreshold) {
    return { key: "attention", label: "Atencao", className: "attention" };
  }
  if (safeAccuracy >= Math.min(100, safeThreshold + 20)) {
    return { key: "strong", label: "Forca", className: "positive" };
  }
  return { key: "ok", label: "Ok", className: "neutral" };
}

function normalizeRankingAvatar(avatar) {
  return {
    ...defaultAvatar,
    ...(avatar || {}),
    kind: "chibi",
    base: avatar?.base || defaultAvatar.base,
    hair: avatar?.hair || defaultAvatar.hair,
    eyes: avatar?.eyes || defaultAvatar.eyes,
    mouths: avatar?.mouths || avatar?.mouth || defaultAvatar.mouths,
    shirts: avatar?.shirts || avatar?.outfit || defaultAvatar.shirts,
    accessories: avatar?.accessories || defaultAvatar.accessories,
    accessories2: avatar?.accessories2 || defaultAvatar.accessories2,
    pants: avatar?.pants || defaultAvatar.pants,
    shoes: avatar?.shoes || defaultAvatar.shoes,
    pets: avatar?.pets || defaultAvatar.pets,
    layerOrder: normalizeAvatarLayerOrder(avatar?.layerOrder)
  };
}

function getRankingAudienceLabel(audience = {}) {
  if (audience.grade && audience.className) return `${audience.grade} ${audience.className}`;
  if (audience.grade) return audience.grade;
  return "geral";
}

function getRankingSliceId({ weekKey, audience = {} }) {
  return [
    weekKey || "semana",
    audience.grade || "geral",
    audience.className || "todas"
  ].join("__");
}

function buildStudentFeedback(student, classAverageAccuracy) {
  if (!student) return "Selecione um aluno para ver um feedback pedagogico.";
  if (!student.solved) return "Ainda nao ha respostas suficientes para avaliar desempenho.";
  if (student.accuracy >= classAverageAccuracy + 10) return "Desempenho acima da media da turma. Bom candidato para desafios extras e ranking competitivo.";
  if (student.accuracy <= classAverageAccuracy - 10) return "Desempenho abaixo da media da turma. Vale observar dificuldades por area e oferecer retomada guiada.";
  return "Desempenho proximo da media da turma. Acompanhe regularidade semanal e evolucao nas proximas missoes.";
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("missions");
  const [users, setUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [missionAttempts, setMissionAttempts] = useState([]);
  const [accessoryRequests, setAccessoryRequests] = useState([]);
  const [accessoryShopPrices, setAccessoryShopPrices] = useState({});
  const [accessoryShopCategories, setAccessoryShopCategories] = useState({});
  const [accessoryTitles, setAccessoryTitles] = useState({});
  const [accessoryDescriptions, setAccessoryDescriptions] = useState({});
  const [creationFilters, setCreationFilters] = useState({ status: "review", category: "" });
  const [editingAccessoryArt, setEditingAccessoryArt] = useState(null);
  const [editingAccessoryPixelData, setEditingAccessoryPixelData] = useState(null);
  const [savingAccessoryArt, setSavingAccessoryArt] = useState(false);
  const [adminAvatarCatalog, setAdminAvatarCatalog] = useState(null);
  const [question, setQuestion] = useState(initialQuestion);
  const [mission, setMission] = useState(initialMission);
  const [loadErrors, setLoadErrors] = useState([]);
  const [draggingQuestionId, setDraggingQuestionId] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [draggingUserId, setDraggingUserId] = useState("");
  const [classDropTargetKey, setClassDropTargetKey] = useState("");
  const [questionFilters, setQuestionFilters] = useState({ area: "", difficulty: "" });
  const [analyticsFilters, setAnalyticsFilters] = useState({ grade: "", className: "" });
  const [analyticsStudentId, setAnalyticsStudentId] = useState("");
  const [analyticsAttentionThreshold, setAnalyticsAttentionThreshold] = useState(60);
  const [classFilters, setClassFilters] = useState({ grade: "", className: "" });
  const [classroomDraft, setClassroomDraft] = useState(initialClassroom);
  const [studentSearch, setStudentSearch] = useState("");
  const [relocationSearch, setRelocationSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [rewardingUser, setRewardingUser] = useState(null);
  const [classMessage, setClassMessage] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingMission, setEditingMission] = useState(null);
  const [socialConfig, setSocialConfig] = useState({ visibilityScope: "class" });
  const [socialMessage, setSocialMessage] = useState("");
  const [wallMessages, setWallMessages] = useState([]);
  const [weeklyRankingConfig, setWeeklyRankingConfig] = useState(defaultWeeklyRankingConfig);
  const [weeklyRankingMessage, setWeeklyRankingMessage] = useState("");
  const [weeklyRankingLimit, setWeeklyRankingLimit] = useState(5);
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
  const managedClassrooms = useMemo(() => buildManagedClassrooms(classrooms, classStats), [classrooms, classStats]);
  const classroomChoices = useMemo(() => buildClassroomOptions(classrooms, users), [classrooms, users]);
  const gradeOptions = useMemo(
    () => classroomChoices.gradeOptions,
    [classroomChoices]
  );
  const classOptions = useMemo(
    () => classroomChoices.classOptions,
    [classroomChoices]
  );
  const missionClassroomOptions = useMemo(
    () => {
      const options = classroomChoices.classroomOptions.slice();
      const missionKey = classroomKey({ grade: mission.targetGrade, className: mission.targetClass });
      if (mission.targetGrade && mission.targetClass && !options.some((option) => option.value === missionKey)) {
        options.unshift({
          value: missionKey,
          label: `${mission.targetGrade} - ${mission.targetClass}`,
          classroom: { grade: mission.targetGrade, className: mission.targetClass }
        });
      }
      if (!options.length) {
        options.push({
          value: classroomKey({ grade: mission.targetGrade, className: mission.targetClass }),
          label: `${mission.targetGrade} - ${mission.targetClass}`,
          classroom: { grade: mission.targetGrade, className: mission.targetClass }
        });
      }
      return options;
    },
    [classroomChoices, mission.targetGrade, mission.targetClass]
  );
  const editingMissionClassroomOptions = useMemo(
    () => {
      const options = classroomChoices.classroomOptions.slice();
      if (!editingMission?.targetGrade || !editingMission?.targetClass) return options;
      const editingKey = classroomKey({ grade: editingMission.targetGrade, className: editingMission.targetClass });
      if (!options.some((option) => option.value === editingKey)) {
        options.unshift({
          value: editingKey,
          label: `${editingMission.targetGrade} - ${editingMission.targetClass}`,
          classroom: { grade: editingMission.targetGrade, className: editingMission.targetClass }
        });
      }
      return options;
    },
    [classroomChoices, editingMission]
  );
  const analyticsClassroomOptions = useMemo(
    () => [
      { value: "", label: "Todas as turmas" },
      ...classroomChoices.classroomOptions
    ],
    [classroomChoices]
  );
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
      return managedClassrooms.find((item) => item.grade === classFilters.grade && item.className === classFilters.className) || null;
    },
    [managedClassrooms, classFilters, isPendingClassView, isUnassignedClassView, pendingClassStats, unassignedClassStats]
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
          return [user.name, user.email, user.grade, user.className, user.requestedClassTag]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        })
        .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email))),
    [users, classFilters, studentSearch, isPendingClassView, isUnassignedClassView]
  );
  const relocationUsers = useMemo(
    () => {
      const search = relocationSearch.trim().toLowerCase();
      return users
        .filter((user) => {
          if (!search) return true;
          return [user.name, user.email, user.grade, user.className, user.requestedClassTag, user.status, user.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        })
        .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
    },
    [users, relocationSearch]
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
  const weekInfo = useMemo(() => getCurrentWeekInfo(), []);
  const studentAnalytics = useMemo(
    () => buildStudentAnalytics({ users, attempts: missionAttempts, filters: analyticsFilters, weekInfo, attentionThreshold: analyticsAttentionThreshold }),
    [users, missionAttempts, analyticsFilters, weekInfo, analyticsAttentionThreshold]
  );
  const classAverageAccuracy = studentAnalytics.length
    ? Math.round(studentAnalytics.reduce((total, student) => total + student.accuracy, 0) / studentAnalytics.length)
    : 0;
  const weeklyStudentRanking = useMemo(
    () => studentAnalytics
      .filter((student) => student.weeklyMissions > 0 || student.weeklyXp > 0)
      .sort((a, b) => b.weeklyXp - a.weeklyXp || b.weeklyAccuracy - a.weeklyAccuracy || b.weeklySolved - a.weeklySolved)
      .map((student, index) => ({ ...student, position: index + 1 })),
    [studentAnalytics]
  );
  const classStudentRanking = useMemo(
    () => studentAnalytics
      .slice()
      .sort((a, b) => b.accuracy - a.accuracy || b.solved - a.solved || b.totalXp - a.totalXp),
    [studentAnalytics]
  );
  const selectedStudentAnalytics = useMemo(
    () => studentAnalytics.find((student) => student.id === analyticsStudentId) || classStudentRanking[0] || null,
    [studentAnalytics, analyticsStudentId, classStudentRanking]
  );
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
  const creationSummary = useMemo(() => accessoryRequests.reduce((summary, item) => {
    const status = item.status || "pending";
    return {
      ...summary,
      [status]: Number(summary[status] || 0) + 1
    };
  }, {}), [accessoryRequests]);
  const filteredAccessoryRequests = useMemo(() => accessoryRequests.filter((item) => {
    const status = item.status || "pending";
    const category = accessoryShopCategories[item.id] || item.shopCategoryKey || item.category || "accessories";
    const statusMatches = creationFilters.status === "all"
      || (creationFilters.status === "review" && ["pending", "voting"].includes(status))
      || status === creationFilters.status;
    const categoryMatches = !creationFilters.category || category === creationFilters.category;
    return statusMatches && categoryMatches;
  }), [accessoryRequests, accessoryShopCategories, creationFilters]);

  async function refresh() {
    const results = await Promise.allSettled([
      listUsers(),
      listAllQuestions(),
      listAllMissions(),
      listMissionAttempts(),
      listAccessoryRequests(),
      getSocialConfig(),
      getEconomyConfig(),
      loadAvatarCatalog({ force: true }),
      getWeeklyRankingConfig(),
      listWallMessages({ includeHidden: true, pageSize: 100 }),
      listClassrooms()
    ]);
    const labels = ["usuarios", "questoes", "missoes", "tentativas", "criacoes", "social", "economia", "catalogo", "ranking semanal", "mural", "turmas"];
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
      if (index === 8) setWeeklyRankingConfig(result.value);
      if (index === 9) setWallMessages(result.value);
      if (index === 10) setClassrooms(result.value);
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

  function applyMissionClassroom(optionKey) {
    const selected = missionClassroomOptions.find((option) => option.value === optionKey)?.classroom;
    if (!selected) return;
    setMission((current) => ({
      ...current,
      targetGrade: selected.grade,
      targetClass: selected.className
    }));
  }

  function applyEditingMissionClassroom(optionKey) {
    const selected = editingMissionClassroomOptions.find((option) => option.value === optionKey)?.classroom;
    if (!selected) return;
    setEditingMission((current) => ({
      ...current,
      targetGrade: selected.grade,
      targetClass: selected.className
    }));
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

  function applyClassroomToEditingUser(classroom) {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      grade: classroom.grade,
      className: classroom.className
    });
  }

  async function handleCreateClassroom(event) {
    event.preventDefault();
    setClassMessage("");
    const exists = managedClassrooms.some((item) => item.grade === classroomDraft.grade && item.className === classroomDraft.className);
    if (exists && !window.confirm("Esta serie/turma ja aparece na lista. Criar um cadastro mesmo assim para nomear e fixar no Firebase?")) return;

    await createClassroom(classroomDraft);
    setClassroomDraft(initialClassroom);
    setClassMessage("Turma cadastrada no Firebase.");
    await refresh();
  }

  async function handleDeleteClassroom(classroom) {
    const assignedUsers = users.filter((user) => user.grade === classroom.grade && user.className === classroom.className);
    const shouldDelete = window.confirm(
      `Excluir a turma "${classroom.name || classroom.key}"? ${assignedUsers.length} perfil(is) ficarao sem turma ate o ADM realocar.`
    );
    if (!shouldDelete) return;

    await Promise.all([
      ...assignedUsers.map((user) => updateUserClass(user.id, { grade: "", className: "" })),
      ...(classroom.id ? [deleteClassroom(classroom.id)] : [])
    ]);
    setClassFilters({ grade: UNASSIGNED_CLASS_KEY, className: "" });
    setClassMessage(`${assignedUsers.length} perfil(is) ficaram sem turma para realocacao.`);
    await refresh();
  }

  async function handleDropUserOnClass(event, classroom) {
    event.preventDefault();
    const userId = event.dataTransfer.getData("text/user-id") || draggingUserId;
    setDraggingUserId("");
    setClassDropTargetKey("");
    if (!userId || !classroom?.grade || !classroom?.className) return;

    const user = users.find((item) => item.id === userId);
    await updateUserClass(userId, { grade: classroom.grade, className: classroom.className });
    setClassFilters({ grade: classroom.grade, className: classroom.className });
    setClassMessage(`${user?.name || user?.email || "Usuario"} realocado para ${classroom.name || classroom.key}.`);
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

  async function handleAccessoryDetailsSave(item) {
    const title = String(accessoryTitles[item.id] ?? item.title ?? "").trim();
    const description = String(accessoryDescriptions[item.id] ?? item.description ?? "").trim();
    if (!title) return;
    await updateAccessoryRequestDetails(item.id, { title, description });
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

  async function handleToggleWallMessage(message) {
    await setWallMessageStatus(message.id, message.status === "hidden" ? "visible" : "hidden");
    setWallMessages(await listWallMessages({ includeHidden: true, pageSize: 100 }));
  }

  async function handleDeleteWallMessage(message) {
    const ok = window.confirm(`Excluir o recado de ${message.authorName || "colega"}?`);
    if (!ok) return;
    await deleteWallMessage(message.id);
    setWallMessages(await listWallMessages({ includeHidden: true, pageSize: 100 }));
  }

  async function handleSaveEconomyConfig(event) {
    event.preventDefault();
    setEconomyMessage("");
    await saveEconomyConfig(economyConfig);
    setEconomyMessage("Controle financeiro salvo.");
  }

  async function handlePublishWeeklyRanking() {
    setWeeklyRankingMessage("");
    const safeLimit = Math.max(1, Math.min(20, Number(weeklyRankingLimit || 5)));
    const entries = weeklyStudentRanking.slice(0, safeLimit).map((student) => ({
      userId: student.id,
      position: student.position,
      name: student.name,
      grade: student.grade,
      className: student.className,
      avatar: student.avatar,
      level: student.level,
      totalXp: student.totalXp,
      weeklyXp: student.weeklyXp,
      weeklyAccuracy: student.weeklyAccuracy,
      weeklySolved: student.weeklySolved,
      weeklyMissions: student.weeklyMissions
    }));
    const audience = {
      grade: analyticsFilters.grade,
      className: analyticsFilters.className
    };
    const title = `Ranking semanal ${getRankingAudienceLabel(audience)}`;
    const rankingSlice = {
      id: getRankingSliceId({ weekKey: weekInfo.key, audience }),
      published: true,
      title,
      weekKey: weekInfo.key,
      weekLabel: weekInfo.label,
      limit: safeLimit,
      audience,
      entries
    };
    const existingRankings = Array.isArray(weeklyRankingConfig.rankings)
      ? weeklyRankingConfig.rankings
      : (weeklyRankingConfig.entries?.length ? [weeklyRankingConfig] : []);
    const nextRankings = [
      rankingSlice,
      ...existingRankings.filter((ranking) => {
        const currentId = ranking.id || getRankingSliceId({ weekKey: ranking.weekKey, audience: ranking.audience });
        return currentId !== rankingSlice.id;
      })
    ];

    const nextConfig = {
      ...rankingSlice,
      published: true,
      rankings: nextRankings
    };

    await saveWeeklyRankingConfig(nextConfig);
    setWeeklyRankingConfig(nextConfig);
    setWeeklyRankingMessage(`Ranking semanal ${getRankingAudienceLabel(audience)} publicado para os alunos.`);
  }

  async function handleHideWeeklyRanking() {
    setWeeklyRankingMessage("");
    const nextConfig = {
      ...weeklyRankingConfig,
      published: false
    };
    await saveWeeklyRankingConfig(nextConfig);
    setWeeklyRankingConfig(nextConfig);
    setWeeklyRankingMessage("Ranking semanal ocultado dos alunos.");
  }

  async function handleShowWeeklyRanking() {
    setWeeklyRankingMessage("");
    if (!weeklyRankingConfig.entries?.length && !weeklyRankingConfig.rankings?.length) {
      setWeeklyRankingMessage("Nao ha ranking salvo para exibir. Publique um recorte primeiro.");
      return;
    }

    const nextConfig = {
      ...weeklyRankingConfig,
      published: true
    };
    await saveWeeklyRankingConfig(nextConfig);
    setWeeklyRankingConfig(nextConfig);
    setWeeklyRankingMessage("Ranking semanal exibido para os alunos.");
  }

  async function handleDeleteWeeklyRanking() {
    const shouldDelete = window.confirm("Excluir o ranking semanal publicado? Depois voce podera publicar outro recorte.");
    if (!shouldDelete) return;

    setWeeklyRankingMessage("");
    await deleteWeeklyRankingConfig();
    setWeeklyRankingConfig(defaultWeeklyRankingConfig);
    setWeeklyRankingMessage("Ranking semanal excluido. Escolha uma serie ou turma e publique um novo recorte.");
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
                <ChoicePills
                  label="Turma da missao"
                  value={classroomKey({ grade: mission.targetGrade, className: mission.targetClass })}
                  options={missionClassroomOptions}
                  onChange={applyMissionClassroom}
                  className="compact blocky"
                />
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
                <ChoicePills label="Status" value={mission.status} options={missionStatusOptions} onChange={(status) => setMission({ ...mission, status })} className="compact blocky" />
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
                    <ChoicePills label="Assunto" value={questionFilters.area} options={areaFilterOptions} onChange={(area) => setQuestionFilters({ ...questionFilters, area })} className="compact" />
                    <ChoicePills label="Nivel" value={questionFilters.difficulty} options={difficultyFilterOptions} onChange={(difficulty) => setQuestionFilters({ ...questionFilters, difficulty })} className="compact" />
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
                        <ChoicePills
                          label="Turma da missao"
                          value={classroomKey({ grade: editingMission.targetGrade, className: editingMission.targetClass })}
                          options={editingMissionClassroomOptions}
                          onChange={applyEditingMissionClassroom}
                          className="compact blocky"
                        />
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
                        <ChoicePills label="Status" value={editingMission.status} options={missionStatusOptions} onChange={(status) => setEditingMission({ ...editingMission, status })} className="compact blocky" />
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
                <ChoicePills label="Area" value={question.area} options={areaOptions} onChange={(area) => setQuestion({ ...question, area })} className="compact" />
                <ChoicePills label="Dificuldade" value={question.difficulty} options={difficultyOptions} onChange={(difficulty) => setQuestion({ ...question, difficulty })} className="compact" />
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
              <ChoicePills label="Assunto" value={questionFilters.area} options={areaFilterOptions} onChange={(area) => setQuestionFilters({ ...questionFilters, area })} className="compact" />
              <ChoicePills label="Nivel" value={questionFilters.difficulty} options={difficultyFilterOptions} onChange={(difficulty) => setQuestionFilters({ ...questionFilters, difficulty })} className="compact" />
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
                        <ChoicePills label="Area" value={editingQuestion.area} options={areaOptions} onChange={(area) => setEditingQuestion({ ...editingQuestion, area })} className="compact" />
                        <ChoicePills label="Dificuldade" value={editingQuestion.difficulty} options={difficultyOptions} onChange={(difficulty) => setEditingQuestion({ ...editingQuestion, difficulty })} className="compact" />
                        <label>
                          XP
                          <input
                            type="number"
                            min="0"
                            value={editingQuestion.xp}
                            onChange={(event) => setEditingQuestion({ ...editingQuestion, xp: event.target.value })}
                          />
                        </label>
                        <ChoicePills
                          label="Status"
                          value={editingQuestion.active ? "active" : "inactive"}
                          options={questionStatusOptions}
                          onChange={(status) => setEditingQuestion({ ...editingQuestion, active: status === "active" })}
                          className="compact blocky"
                        />
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
              <span>Cadastre turmas no Firebase ou use as turmas ja encontradas nos usuarios atuais.</span>
            </div>
            <Users size={26} />
          </div>

          <form className="classroom-create-card" onSubmit={handleCreateClassroom}>
            <div>
              <p className="eyebrow">Cadastro dinamico</p>
              <h4>Nova turma</h4>
              <span>Depois de criada, ela fica disponivel para realocar alunos e montar missoes sem mexer no codigo.</span>
            </div>
            <label>
              Nome exibido
              <input
                value={classroomDraft.name}
                onChange={(event) => setClassroomDraft({ ...classroomDraft, name: event.target.value })}
                placeholder="Ex.: ADM Testes, EJA Noite, Design"
              />
            </label>
            <label>
              Serie ou grupo
              <input
                value={classroomDraft.grade}
                onChange={(event) => setClassroomDraft({ ...classroomDraft, grade: event.target.value })}
                placeholder="Ex.: 1 ano, EJA, ADM"
                required
              />
            </label>
            <label>
              Turma
              <input
                value={classroomDraft.className}
                onChange={(event) => setClassroomDraft({ ...classroomDraft, className: event.target.value })}
                placeholder="Ex.: A, Noite, Testes"
                required
              />
            </label>
            <button type="submit">Criar turma</button>
          </form>

          <section className="classroom-relocation-board">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Realocacao rapida</p>
                <h3>Arraste para uma turma</h3>
                <span>Use a busca, arraste o aluno ou ADM e solte em uma turma existente abaixo.</span>
              </div>
            </div>
            <div className="student-search-row">
              <label>
                Buscar usuario
                <input
                  value={relocationSearch}
                  onChange={(event) => setRelocationSearch(event.target.value)}
                  placeholder="Nome, e-mail, serie, turma, status ou papel"
                />
              </label>
              {relocationSearch && (
                <button type="button" className="secondary" onClick={() => setRelocationSearch("")}>
                  Limpar
                </button>
              )}
            </div>
            <div className="relocation-user-strip" aria-label="Usuarios para realocar">
              {relocationUsers.map((user) => (
                <article
                  key={`${user.id}-relocation`}
                  className={`relocation-user-card ${draggingUserId === user.id ? "is-dragging" : ""}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/user-id", user.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingUserId(user.id);
                  }}
                  onDragEnd={() => {
                    setDraggingUserId("");
                    setClassDropTargetKey("");
                  }}
                >
                  <AvatarPreview avatar={user.avatar} size={42} />
                  <div>
                    <strong>{user.name || user.email}</strong>
                    {user.requestedClassTag && <small>Tag: {user.requestedClassTag}</small>}
                    <span>{user.grade || "sem serie"} / {user.className || "sem turma"} · {user.role || "student"}</span>
                  </div>
                </article>
              ))}
              {!relocationUsers.length && <p className="muted">Nenhum usuario encontrado para esse filtro.</p>}
            </div>
          </section>

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
            {managedClassrooms.map((group) => {
              const active = classFilters.grade === group.grade && classFilters.className === group.className;
              return (
                <button
                  type="button"
                  className={`${active ? "active" : ""} ${group.source === "firebase" ? "registered-class-card" : ""} ${classDropTargetKey === group.key ? "drop-ready" : ""}`.trim()}
                  key={`${group.key}-manage`}
                  onDragOver={(event) => {
                    if (!draggingUserId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setClassDropTargetKey(group.key);
                  }}
                  onDragLeave={() => setClassDropTargetKey("")}
                  onDrop={(event) => handleDropUserOnClass(event, group)}
                  onClick={() => {
                    setClassFilters({ grade: group.grade, className: group.className });
                    setEditingUser(null);
                    setRewardingUser(null);
                    setStudentSearch("");
                    setClassMessage("");
                  }}
                >
                  <strong>{group.name || group.key}</strong>
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
                  <h4>{selectedClassStats.name || selectedClassStats.key}</h4>
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
                <div className="row-actions">
                  {!selectedClassStats.isPending && !selectedClassStats.isUnassigned && (
                    <button type="button" className="danger-button" onClick={() => handleDeleteClassroom(selectedClassStats)}>
                      Excluir turma
                    </button>
                  )}
                  <button type="button" className="secondary" onClick={() => setClassFilters({ grade: "", className: "" })}>
                    Fechar
                  </button>
                </div>
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
                              <ChoicePills label="Serie" value={editingUser.grade} options={gradeOptions} onChange={(grade) => setEditingUser({ ...editingUser, grade })} className="compact" />
                              <ChoicePills label="Turma" value={editingUser.className} options={classOptions} onChange={(className) => setEditingUser({ ...editingUser, className })} className="compact" />
                            </div>
                            <div className="classroom-pick-list">
                              <span>Realocar para</span>
                              <div>
                                {managedClassrooms.map((classroom) => (
                                  <button
                                    type="button"
                                    key={`${editingUser.id}-${classroom.key}`}
                                    className={editingUser.grade === classroom.grade && editingUser.className === classroom.className ? "active" : ""}
                                    onClick={() => applyClassroomToEditingUser(classroom)}
                                  >
                                    {classroom.name || classroom.key}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <ChoicePills label="Status" value={editingUser.status} options={userStatusOptions} onChange={(status) => setEditingUser({ ...editingUser, status })} className="compact blocky" />
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
                                {user.requestedClassTag && <em>Tag informada: {user.requestedClassTag}</em>}
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
                                  : selectedClassStats.isPending || selectedClassStats.isUnassigned ? managedClassrooms[0]?.grade || "1 ano" : selectedClassStats.grade,
                                className: classOptions.includes(user.className)
                                  ? user.className
                                  : selectedClassStats.isPending || selectedClassStats.isUnassigned ? managedClassrooms[0]?.className || "A" : selectedClassStats.className
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
                  <ChoicePills
                    label="Serie"
                    value={gradeOptions.includes(user.grade) ? user.grade : ""}
                    options={[{ value: "", label: "Serie" }, ...gradeOptions.map((grade) => ({ value: grade, label: grade }))]}
                    onChange={(grade) => updateUserClass(user.id, {
                      grade,
                      className: classOptions.includes(user.className) ? user.className : "A"
                    }).then(refresh)}
                    className="compact"
                  />
                  <ChoicePills
                    label="Turma"
                    value={classOptions.includes(user.className) ? user.className : ""}
                    options={[{ value: "", label: "Turma" }, ...classOptions.map((className) => ({ value: className, label: className }))]}
                    onChange={(className) => updateUserClass(user.id, {
                      grade: gradeOptions.includes(user.grade) ? user.grade : "1 ano",
                      className
                    }).then(refresh)}
                    className="compact"
                  />
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

          <div className="creation-filter-panel">
            <div>
              <strong>{filteredAccessoryRequests.length} criacao(oes)</strong>
              <span>
                {Number(creationSummary.pending || 0)} pendente(s) · {Number(creationSummary.voting || 0)} em votacao · {Number(creationSummary.listed || 0)} na loja
              </span>
            </div>
            <div className="creation-filter-group">
              <span>Situacao</span>
              <div className="creation-filter-pills">
                {creationStatusFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.value}
                    className={creationFilters.status === filter.value ? "active" : ""}
                    onClick={() => setCreationFilters((current) => ({ ...current, status: filter.value }))}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="creation-filter-group category-group">
              <span>Categoria</span>
              <div className="creation-category-pills">
                <button
                  type="button"
                  className={!creationFilters.category ? "active" : ""}
                  onClick={() => setCreationFilters((current) => ({ ...current, category: "" }))}
                >
                  Todas
                </button>
                {avatarItemCategoryOptions.map((category) => (
                  <button
                    type="button"
                    key={category.value}
                    className={creationFilters.category === category.value ? "active" : ""}
                    onClick={() => setCreationFilters((current) => ({ ...current, category: category.value }))}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="accessory-request-grid">
            {filteredAccessoryRequests.map((item) => {
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
                  <label className="accessory-title-edit accessory-details-edit">
                    Nome do item
                    <input
                      value={accessoryTitles[item.id] ?? item.title ?? ""}
                      onChange={(event) => setAccessoryTitles((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))}
                      maxLength={48}
                    />
                    Descricao do item
                    <textarea
                      value={accessoryDescriptions[item.id] ?? item.description ?? ""}
                      onChange={(event) => setAccessoryDescriptions((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))}
                      maxLength={180}
                      rows={3}
                    />
                    <button type="button" className="secondary" onClick={() => handleAccessoryDetailsSave(item)}>
                      Salvar nome e descricao
                    </button>
                  </label>
                  <ChoicePills
                    label="Status"
                    value={item.status || "pending"}
                    options={accessoryStatusOptions}
                    onChange={(status) => handleAccessoryStatus(item, status)}
                    className="compact blocky"
                  />
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
                  <ChoicePills
                    label="Categoria"
                    value={selectedShopCategory}
                    options={avatarItemCategoryOptions}
                    onChange={(category) => setAccessoryShopCategories((current) => ({
                      ...current,
                      [item.id]: category
                    }))}
                    className="compact blocky"
                  />
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
            {accessoryRequests.length > 0 && !filteredAccessoryRequests.length && <p className="muted">Nenhuma criacao encontrada para estes filtros.</p>}
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
              <label>
                Publicar recado no Mural
                <input
                  type="number"
                  min="0"
                  value={economyConfig.wallMessagePrice}
                  onChange={(event) => setEconomyConfig((current) => ({ ...current, wallMessagePrice: event.target.value }))}
                />
                <small>Cobrado por recado publicado por aluno. O ADM publica sem custo.</small>
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
            <ChoicePills
              label="Quem pode aparecer para os alunos"
              value={socialConfig.visibilityScope || "class"}
              options={socialVisibilityOptions}
              onChange={(visibilityScope) => setSocialConfig({ ...socialConfig, visibilityScope })}
              className="blocky"
            />
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

          <div className="wall-admin-list">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Mural de recados</p>
                <h3>{wallMessages.length} recado(s) recentes</h3>
                <span>Oculte ou exclua mensagens inadequadas. Recados do ADM aparecem destacados para os alunos.</span>
              </div>
            </div>
            {wallMessages.map((wallMessage) => (
              <article className={`wall-admin-card ${wallMessage.status === "hidden" ? "hidden" : ""}`} key={wallMessage.id}>
                <div>
                  <strong>{wallMessage.authorName || "Colega"}</strong>
                  <span>{wallMessage.authorRole === "admin" ? "ADM" : `${wallMessage.authorGrade || "Sem serie"} ${wallMessage.authorClassName || ""}`}</span>
                  <p>{wallMessage.text}</p>
                </div>
                <div className="row-actions">
                  <button type="button" className="secondary" onClick={() => handleToggleWallMessage(wallMessage)}>
                    {wallMessage.status === "hidden" ? "Exibir" : "Ocultar"}
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDeleteWallMessage(wallMessage)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
            {!wallMessages.length && <p className="muted">Nenhum recado publicado ainda.</p>}
          </div>
        </section>
      )}

      {activeTab === "analytics" && (
        <section className="admin-section analytics-dashboard">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Graficos</p>
              <h3>Central de desempenho pedagogico</h3>
              <span>Compare turmas, acompanhe alunos e publique rankings semanais quando fizer sentido para o jogo.</span>
            </div>
            <BarChart3 size={26} />
          </div>

          <div className="analytics-control-panel">
            <div>
              <strong>Recorte de analise</strong>
              <span>{analyticsFilters.grade || "Todas as series"} / {analyticsFilters.className || "todas as turmas"}</span>
            </div>
            <ChoicePills
              label="Turma"
              value={analyticsFilters.grade && analyticsFilters.className ? classroomKey({ grade: analyticsFilters.grade, className: analyticsFilters.className }) : ""}
              options={analyticsClassroomOptions}
              onChange={(optionKey) => {
                const selected = analyticsClassroomOptions.find((option) => option.value === optionKey)?.classroom;
                setAnalyticsFilters(selected ? { grade: selected.grade, className: selected.className } : { grade: "", className: "" });
              }}
              className="compact"
            />
            <label className="analytics-threshold-control">
              Atencao abaixo de
              <input
                type="number"
                min="0"
                max="100"
                value={analyticsAttentionThreshold}
                onChange={(event) => setAnalyticsAttentionThreshold(Math.max(0, Math.min(100, Number(event.target.value || 0))))}
              />
              <span>%</span>
            </label>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setAnalyticsFilters({ grade: "", className: "" });
                setAnalyticsStudentId("");
              }}
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
                  onClick={() => {
                    setAnalyticsFilters({ grade: group.grade, className: group.className });
                    setAnalyticsStudentId("");
                  }}
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

          <div className="analytics-insight-grid">
            <article>
              <strong>Leitura rapida</strong>
              <span>
                {analyticsSummary.students
                  ? `${analyticsSummary.accuracy}% de acerto medio com ${analyticsSummary.participation}% de participacao.`
                  : "Ainda nao ha dados suficientes para este recorte."}
              </span>
            </article>
            <article>
              <strong>Uso pedagogico</strong>
              <span>Missoes e areas abaixo de {analyticsAttentionThreshold}% entram em atencao. Use isso para achar lacunas coletivas e decidir reforco.</span>
            </article>
            <article>
              <strong>Uso no jogo</strong>
              <span>O ranking semanal usa XP da semana, taxa de acerto e volume de respostas. Publique quando quiser transformar desempenho em evento competitivo.</span>
            </article>
          </div>

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

          <section className="analytics-panel weekly-ranking-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranking semanal</p>
                <h3>Publicar para os alunos</h3>
                <span>
                  Semana {weekInfo.label} · {weeklyStudentRanking.length} aluno(s) com atividade · {analyticsFilters.grade ? (analyticsFilters.className ? "ranking da turma" : "ranking da serie") : "ranking geral"}
                </span>
              </div>
              <Trophy size={24} />
            </div>
            <div className="weekly-ranking-status">
              <div>
                <strong>{weeklyRankingConfig.published ? "Publicado" : "Oculto"}</strong>
                <span>
                  {weeklyRankingConfig.published
                    ? `${weeklyRankingConfig.rankings?.length || 1} recorte(s) disponivel(is) · ${weeklyRankingConfig.weekLabel || weekInfo.label}`
                    : "Os alunos ainda nao veem ranking semanal no inicio."}
                </span>
              </div>
              <div className="row-actions">
                <label className="weekly-ranking-limit">
                  Top
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={weeklyRankingLimit}
                    onChange={(event) => setWeeklyRankingLimit(Math.max(1, Math.min(20, Number(event.target.value || 5))))}
                  />
                </label>
                <button type="button" onClick={handlePublishWeeklyRanking} disabled={!weeklyStudentRanking.length}>
                  Publicar/substituir recorte
                </button>
                {weeklyRankingConfig.published ? (
                  <button type="button" className="secondary" onClick={handleHideWeeklyRanking}>
                    Ocultar dos alunos
                  </button>
                ) : (
                  <button type="button" className="secondary" onClick={handleShowWeeklyRanking} disabled={!weeklyRankingConfig.entries?.length && !weeklyRankingConfig.rankings?.length}>
                    Exibir aos alunos
                  </button>
                )}
                <button type="button" className="secondary danger-button" onClick={handleDeleteWeeklyRanking}>
                  Excluir ranking
                </button>
              </div>
            </div>
            {weeklyRankingMessage && <p className="muted">{weeklyRankingMessage}</p>}
            <div className="analytics-ranking student-ranking-preview">
              {weeklyStudentRanking.slice(0, weeklyRankingLimit).map((student) => (
                <article key={`${student.id}-weekly-rank`}>
                  <strong>{student.position}</strong>
                  <AvatarPreview avatar={student.avatar} size={44} catalog={adminAvatarCatalog} />
                  <div>
                    <b>{student.name}</b>
                    <span>Nivel {student.level} · {student.grade} / {student.className} · {student.weeklyMissions} missao(oes)</span>
                  </div>
                  <small>{student.weeklyXp} XP · {student.weeklyAccuracy}%</small>
                </article>
              ))}
              {!weeklyStudentRanking.length && <p className="muted">Sem atividade concluida nesta semana para o recorte selecionado.</p>}
            </div>
          </section>

          <section className="analytics-panel student-comparison-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Alunos</p>
                <h3>Comparar dentro da sala</h3>
                <span>Ordenado por acerto, volume de respostas e XP total.</span>
              </div>
              <Users size={24} />
            </div>
            <div className="student-comparison-grid">
              <div className="student-rank-list">
                {classStudentRanking.map((student, index) => (
                  <button
                    type="button"
                    className={selectedStudentAnalytics?.id === student.id ? "active" : ""}
                    key={`${student.id}-student-analytics`}
                    onClick={() => setAnalyticsStudentId(student.id)}
                  >
                    <b>{index + 1}</b>
                    <div>
                      <strong>{student.name}</strong>
                      <span>{student.accuracy}% acerto · {student.solved} respostas · {student.totalXp} XP</span>
                    </div>
                  </button>
                ))}
                {!classStudentRanking.length && <p className="muted">Sem alunos aprovados para este recorte.</p>}
              </div>

              <div className="student-feedback-card">
                <div className="research-card-heading">
                  <strong>{selectedStudentAnalytics?.name || "Aluno"}</strong>
                  <span>{selectedStudentAnalytics ? `${selectedStudentAnalytics.grade} / ${selectedStudentAnalytics.className}` : "sem selecao"}</span>
                </div>
                <div className="student-feedback-kpis">
                  <div>
                    <small>ACERTO</small>
                    <b>{selectedStudentAnalytics?.accuracy || 0}%</b>
                  </div>
                  <div>
                    <small>XP</small>
                    <b>{selectedStudentAnalytics?.totalXp || 0}</b>
                  </div>
                  <div>
                    <small>SEMANA</small>
                    <b>{selectedStudentAnalytics?.weeklyXp || 0}</b>
                  </div>
                  <div>
                    <small>SEQUENCIA</small>
                    <b>{selectedStudentAnalytics?.bestStreak || 0}</b>
                  </div>
                </div>
                <p className="analytics-research-note">
                  {buildStudentFeedback(selectedStudentAnalytics, classAverageAccuracy)}
                </p>
                {selectedStudentAnalytics?.strongArea && (
                  <span className="student-feedback-tag positive">Forca: {selectedStudentAnalytics.strongArea.area} ({selectedStudentAnalytics.strongArea.accuracy}%)</span>
                )}
                {selectedStudentAnalytics?.weakArea && (
                  <span className="student-feedback-tag attention">Atencao: {selectedStudentAnalytics.weakArea.area} ({selectedStudentAnalytics.weakArea.accuracy}%)</span>
                )}
              </div>
            </div>
          </section>

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
                const performance = classifyPerformance(item.accuracy, analyticsAttentionThreshold);
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
                      <i className={`performance-badge ${performance.className}`}>{performance.label}</i>
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
                <h3>Indicadores prontos para pesquisa pedagogica</h3>
              </div>
            </div>
            <p className="analytics-research-note">
              Variaveis agregadas por turma e por aluno para acompanhar desempenho, engajamento e progressao. Use estes indicadores como base para comparacoes entre turmas, ciclos de missao e recortes de intervencao.
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
