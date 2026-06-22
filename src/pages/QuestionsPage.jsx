import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Coins, Rocket, Shuffle, Sparkles, Target, Trophy } from "lucide-react";
import QuestionCard from "../components/QuestionCard.jsx";
import AdminClassViewControl from "../components/AdminClassViewControl.jsx";
import { getQuestionsByIds } from "../services/questionService";
import { listOpenMissionsForClass } from "../services/missionService";
import { listSubmittedMissionAttemptIds, submitMissionAttempt } from "../services/progressService";
import { useAuth } from "../services/authService.jsx";
import { getEffectiveClassProfile, readAdminClassView } from "../services/adminViewService";
import { buildShuffledQuestion, seededShuffle } from "../utils/shuffle";

function missionPeriodLabel(mission) {
  if (mission.startsAt && mission.endsAt) return `${mission.startsAt} a ${mission.endsAt}`;
  if (mission.startsAt) return `Disponivel desde ${mission.startsAt}`;
  if (mission.endsAt) return `Disponivel ate ${mission.endsAt}`;
  return "Sem prazo definido";
}

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function alternativeText(question, originalIndex) {
  const alternatives = question.displayAlternatives || question.alternatives?.map((text, index) => ({ text, originalIndex: index })) || [];
  return alternatives.find((item) => Number(item.originalIndex) === Number(originalIndex))?.text || "Alternativa nao encontrada";
}

export default function QuestionsPage() {
  const { firebaseUser, profile, refreshProfile } = useAuth();
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [missionResult, setMissionResult] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [missionStartedAtMs, setMissionStartedAtMs] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [missionLoading, setMissionLoading] = useState(false);
  const [submittingMission, setSubmittingMission] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [adminClassView, setAdminClassView] = useState(() => readAdminClassView());
  const isAdmin = profile?.role === "admin";
  const classProfile = getEffectiveClassProfile(profile, adminClassView);

  const classLabel = useMemo(() => {
    if (!classProfile?.grade || !classProfile?.className) return "turma nao definida";
    return `${classProfile.grade} - ${classProfile.className}`;
  }, [classProfile]);

  const loadMissions = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const openMissions = await listOpenMissionsForClass({
        grade: classProfile?.grade,
        className: classProfile?.className,
        includeAllOpen: false
      });
      let submittedMissionIds = new Set();

      if (!isAdmin) {
        try {
          submittedMissionIds = await listSubmittedMissionAttemptIds(firebaseUser?.uid);
        } catch (attemptError) {
          console.warn("Nao foi possivel carregar tentativas concluidas.", attemptError);
        }
      }
      const completedMissionIds = new Set([
        ...submittedMissionIds,
        ...(Array.isArray(profile?.completedMissionIds) ? profile.completedMissionIds : [])
      ]);

      const visibleMissions = openMissions.filter((mission) => !completedMissionIds.has(mission.id));
      setMissions(visibleMissions);
    } catch (error) {
      console.error(error);
      setLoadError(error?.message || "Nao foi possivel carregar as missoes.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser?.uid, classProfile?.grade, classProfile?.className, profile?.completedMissionIds, isAdmin]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  useEffect(() => {
    if (!selectedMission || !missionStartedAtMs || missionResult) return undefined;

    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [selectedMission, missionStartedAtMs, missionResult]);

  async function startMission(mission) {
    setMissionLoading(true);
    setSelectedMission(mission);
    setAnswers({});
    setMissionResult(null);
    setCurrentQuestionIndex(0);
    setMissionStartedAtMs(Date.now());
    try {
      const missionQuestions = await getQuestionsByIds(mission.questionIds || []);
      const coinValue = missionQuestions.length
        ? Math.round(Number(mission.rewardCoins || 0) / missionQuestions.length)
        : 0;
      const shuffledQuestions = seededShuffle(
        missionQuestions,
        `${firebaseUser.uid}_${mission.id}_questions`
      ).map((question) => ({
        ...buildShuffledQuestion(question, `${firebaseUser.uid}_${mission.id}`),
        coinValue
      }));
      setQuestions(shuffledQuestions);
    } finally {
      setMissionLoading(false);
    }
  }

  async function handleAnswer(question, selectedIndex) {
    const correct = Number(selectedIndex) === Number(question.correctIndex);
    const xpEarned = correct ? Number(question.xp || 0) : 0;
    const nextAnswer = {
      selectedIndex,
      correct,
      xpEarned
    };
    const nextAnswers = {
      ...answers,
      [question.id]: nextAnswer
    };

    setAnswers((current) => ({
      ...current,
      [question.id]: nextAnswer
    }));

    const answeredQuestionIndex = questions.findIndex((item) => item.id === question.id);
    if (answeredQuestionIndex >= 0 && answeredQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(answeredQuestionIndex + 1);
    } else if (answeredQuestionIndex === questions.length - 1) {
      await finishMission(nextAnswers);
    }

    return { correct, xpEarned, alreadyAnswered: false };
  }

  async function finishMission(finalAnswers = answers) {
    if (submittingMission || missionResult) return;

    setSubmittingMission(true);
    try {
      const result = await submitMissionAttempt({
        userId: firebaseUser.uid,
        mission: selectedMission,
        questions,
        answers: finalAnswers,
        startedAtMs: missionStartedAtMs,
        finishedAtMs: Date.now()
      });
      setMissionResult(result);
      await refreshProfile();
      setMissions((current) => current.filter((mission) => mission.id !== selectedMission.id));
    } finally {
      setSubmittingMission(false);
    }
  }

  if (selectedMission) {
    const currentQuestion = questions[currentQuestionIndex];
    const targetSeconds = Math.max(0, Number(selectedMission.targetMinutes || 0) * 60);
    const elapsedSeconds = missionStartedAtMs ? Math.max(0, Math.floor((nowMs - missionStartedAtMs) / 1000)) : 0;
    const remainingSeconds = targetSeconds ? Math.max(0, targetSeconds - elapsedSeconds) : 0;
    const timerProgress = targetSeconds ? Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100)) : 0;
    const timerUrgency = targetSeconds && remainingSeconds <= 60
      ? "danger"
      : targetSeconds && remainingSeconds <= targetSeconds * 0.25
        ? "warning"
        : "";

    return (
      <section className="page-stack">
        <div className="mission-hero">
          <div>
            <p className="eyebrow">Missao ativa</p>
            <h2>{selectedMission.title}</h2>
            <span>{classLabel} · {missionPeriodLabel(selectedMission)} · ordem unica por aluno</span>
          </div>
          {targetSeconds > 0 && (
            <div className={`mission-countdown ${timerUrgency}`}>
              <div>
                <Clock size={18} />
                <span>Tempo restante</span>
              </div>
              <strong>{formatCountdown(remainingSeconds)}</strong>
              <i><b style={{ width: `${timerProgress}%` }} /></i>
            </div>
          )}
          <button type="button" className="secondary" onClick={() => {
            setSelectedMission(null);
            setQuestions([]);
            setAnswers({});
            setMissionResult(null);
            setCurrentQuestionIndex(0);
            setMissionStartedAtMs(0);
          }}>
            Voltar
          </button>
        </div>

        {missionLoading && <p className="muted">Sorteando fases da missao...</p>}
        {!missionLoading && currentQuestion && !submittingMission && !missionResult && (
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            index={currentQuestionIndex}
            showImmediateFeedback={false}
            key={currentQuestion.id}
          />
        )}
        {submittingMission && !missionResult && <p className="muted">Calculando recompensas e preparando feedback...</p>}
        {missionResult && (
          <section className="mission-result">
            <div className="mission-result-hero">
              <div className="mission-result-medal">
                <Trophy size={34} />
              </div>
              <div>
                <p className="eyebrow">{missionResult.alreadySubmitted ? "Resultado recuperado" : "Missao finalizada"}</p>
                <h3>{selectedMission.title}</h3>
                <span>{missionResult.correct} acertos em {missionResult.solved} questoes</span>
              </div>
            </div>
            <div className="mission-reward-grid">
              <article>
                <CheckCircle2 size={20} />
                <span>Precisao</span>
                <strong>{missionResult.solved ? Math.round((missionResult.correct / missionResult.solved) * 100) : 0}%</strong>
              </article>
              <article>
                <Sparkles size={20} />
                <span>XP total</span>
                <strong>+{missionResult.xpEarned || 0}</strong>
              </article>
              <article>
                <Coins size={20} />
                <span>Moedas</span>
                <strong>+{missionResult.coinsEarned || 0}</strong>
              </article>
              <article>
                <Clock size={20} />
                <span>Bonus tempo</span>
                <strong>+{missionResult.timeBonusXp || 0} XP</strong>
              </article>
            </div>
            <p>
              XP das questoes: {missionResult.questionXp || 0}. Bonus da missao: {missionResult.bonusXp || 0}.
              Bonus de tempo: +{missionResult.timeBonusXp || 0} XP e +{missionResult.timeBonusCoins || 0} moedas.
              {missionResult.coinsLost ? ` ${missionResult.coinsLost} moedas perdidas por erro.` : ""}
            </p>
            <div className="answer-review-list">
              {questions.map((question, index) => {
                const answer = answers[question.id];
                if (!answer) return null;

                return (
                  <article className={answer.correct ? "answer-review correct" : "answer-review wrong"} key={`${question.id}-review`}>
                    <div>
                      <span>Questao {index + 1}</span>
                      <strong>{answer.correct ? "Correta" : "Incorreta"}</strong>
                    </div>
                    <h4>{question.statement}</h4>
                    <p>Sua resposta: {alternativeText(question, answer.selectedIndex)}</p>
                    {!answer.correct && <p>Resposta correta: {alternativeText(question, question.correctIndex)}</p>}
                    <small>{question.explanation}</small>
                  </article>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMission(null);
                setQuestions([]);
                setAnswers({});
                setMissionResult(null);
                setCurrentQuestionIndex(0);
                setMissionStartedAtMs(0);
                loadMissions();
              }}
            >
              Voltar para missoes
            </button>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="mission-hero">
        <div>
          <p className="eyebrow">Central de missoes</p>
          <h2>Escolha a missao proposta pelo professor.</h2>
          <span>{classLabel}</span>
        </div>
        <Rocket size={42} />
      </div>

      {isAdmin && (
        <AdminClassViewControl
          value={adminClassView}
          onChange={(next) => {
            setAdminClassView(next);
            setSelectedMission(null);
          }}
          label="ADM testando como aluno desta turma"
        />
      )}

      {loading && <p className="muted">Carregando missoes abertas...</p>}

      {loadError && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Nao consegui carregar as missoes.</h3>
          <p>{loadError}</p>
          <p>Confira se as regras do Firestore foram publicadas e se sua conta esta aprovada.</p>
        </section>
      )}

      {!loading && !loadError && (!classProfile?.grade || !classProfile?.className) && !isAdmin && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Sua turma ainda nao esta definida.</h3>
          <p>Um administrador precisa preencher sua serie e turma para as missoes aparecerem.</p>
        </section>
      )}

      {!loading && !loadError && missions.length === 0 && (isAdmin || (classProfile?.grade && classProfile?.className)) && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Nenhuma missao aberta para sua turma.</h3>
          <p>
            Quando o professor liberar uma missao semanal para {classLabel}, ela aparece aqui.
          </p>
        </section>
      )}

      <div className="mission-grid">
        {missions.map((mission) => (
          <article className="mission-card tcg-mission-card" key={mission.id}>
            <div className="mission-orbit" />
            <div className="tcg-mission-top">
              <p className="eyebrow">{mission.targetGrade} · {mission.targetClass}</p>
              <b>{missionPeriodLabel(mission)}</b>
            </div>
            <h3>{mission.title}</h3>
            <p>{mission.description}</p>
            <div className="mission-stats">
              <span><Target size={16} /> {mission.questionIds?.length || 0} fases</span>
              <span><Shuffle size={16} /> embaralhada</span>
              <span>{mission.targetMinutes || 0} min estimados</span>
              <strong>+{mission.rewardXp || 0} XP bonus</strong>
              <strong>+{mission.rewardCoins || 0} moedas max.</strong>
            </div>
            <button type="button" onClick={() => startMission(mission)}>Iniciar quest</button>
          </article>
        ))}
      </div>
    </section>
  );
}
