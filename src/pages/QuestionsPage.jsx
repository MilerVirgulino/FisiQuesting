import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Rocket, Shuffle, Target } from "lucide-react";
import QuestionCard from "../components/QuestionCard.jsx";
import { getQuestionsByIds } from "../services/questionService";
import { listOpenMissionsForClass } from "../services/missionService";
import { listSubmittedMissionAttemptIds, submitMissionAttempt } from "../services/progressService";
import { useAuth } from "../services/authService.jsx";
import { buildShuffledQuestion, seededShuffle } from "../utils/shuffle";

export default function QuestionsPage() {
  const { firebaseUser, profile, refreshProfile } = useAuth();
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [missionResult, setMissionResult] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missionLoading, setMissionLoading] = useState(false);
  const [submittingMission, setSubmittingMission] = useState(false);
  const [loadError, setLoadError] = useState("");
  const isAdmin = profile?.role === "admin";

  const classLabel = useMemo(() => {
    if (!profile?.grade || !profile?.className) return "turma nao definida";
    return `${profile.grade} - ${profile.className}`;
  }, [profile]);

  const loadMissions = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [openMissions, submittedMissionIds] = await Promise.all([
        listOpenMissionsForClass({
          grade: profile?.grade,
          className: profile?.className,
          includeAllOpen: isAdmin
        }),
        isAdmin ? Promise.resolve(new Set()) : listSubmittedMissionAttemptIds(firebaseUser?.uid)
      ]);
      const completedMissionIds = new Set([
        ...submittedMissionIds,
        ...(Array.isArray(profile?.completedMissionIds) ? profile.completedMissionIds : [])
      ]);

      setMissions(openMissions.filter((mission) => !completedMissionIds.has(mission.id)));
    } catch (error) {
      console.error(error);
      setLoadError(error?.message || "Nao foi possivel carregar as missoes.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser?.uid, profile?.grade, profile?.className, profile?.completedMissionIds, isAdmin]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  async function startMission(mission) {
    setMissionLoading(true);
    setSelectedMission(mission);
    setAnswers({});
    setMissionResult(null);
    setCurrentQuestionIndex(0);
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
    setAnswers((current) => ({
      ...current,
      [question.id]: {
        selectedIndex,
        correct,
        xpEarned
      }
    }));

    return { correct, xpEarned, alreadyAnswered: false };
  }

  function goToNextQuestion() {
    setCurrentQuestionIndex((current) => Math.min(current + 1, questions.length - 1));
  }

  async function finishMission() {
    setSubmittingMission(true);
    try {
      const result = await submitMissionAttempt({
        userId: firebaseUser.uid,
        mission: selectedMission,
        questions,
        answers
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
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
    const isLastQuestion = currentQuestionIndex >= questions.length - 1;

    return (
      <section className="page-stack">
        <div className="mission-hero">
          <div>
            <p className="eyebrow">Missao ativa</p>
            <h2>{selectedMission.title}</h2>
            <span>{classLabel} · ordem unica por aluno</span>
          </div>
          <button type="button" className="secondary" onClick={() => {
            setSelectedMission(null);
            setQuestions([]);
            setAnswers({});
            setMissionResult(null);
            setCurrentQuestionIndex(0);
          }}>
            Voltar
          </button>
        </div>

        {missionLoading && <p className="muted">Sorteando fases da missao...</p>}
        {!missionLoading && currentQuestion && (
          <>
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              index={currentQuestionIndex}
              key={currentQuestion.id}
            />
            {currentAnswer && !isLastQuestion && (
              <div className="row-actions">
                <button type="button" onClick={goToNextQuestion}>
                  Proxima questao
                </button>
              </div>
            )}
          </>
        )}
        {!missionLoading && questions.length > 0 && (
          <section className="mission-finish">
            <div>
              <strong>{Object.keys(answers).length} de {questions.length} fases respondidas</strong>
              <span>
                {isLastQuestion
                  ? "XP e moedas serao gravados apenas ao finalizar a missao."
                  : "Responda a fase atual para liberar a proxima."}
              </span>
            </div>
            <button
              type="button"
              disabled={!isLastQuestion || Object.keys(answers).length < questions.length || submittingMission || Boolean(missionResult)}
              onClick={finishMission}
            >
              {submittingMission ? "Salvando..." : "Finalizar missao"}
            </button>
          </section>
        )}
        {missionResult && (
          <section className="mission-result">
            <strong>{missionResult.alreadySubmitted ? "Missao ja enviada" : "Missao finalizada"}</strong>
            <p>
              {missionResult.correct} acertos em {missionResult.solved} questoes.
              XP de questoes: {missionResult.questionXp || 0}.
              Bonus: {missionResult.bonusXp || 0}.
              Total: {missionResult.xpEarned || 0} XP.
              Moedas: +{missionResult.coinsEarned || 0}
              {missionResult.coinsLost ? ` (${missionResult.coinsLost} perdidas por erro).` : "."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedMission(null);
                setQuestions([]);
                setAnswers({});
                setMissionResult(null);
                setCurrentQuestionIndex(0);
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

      {loading && <p className="muted">Carregando missoes abertas...</p>}

      {loadError && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Nao consegui carregar as missoes.</h3>
          <p>{loadError}</p>
          <p>Confira se as regras do Firestore foram publicadas e se sua conta esta aprovada.</p>
        </section>
      )}

      {!loading && !loadError && (!profile?.grade || !profile?.className) && !isAdmin && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Sua turma ainda nao esta definida.</h3>
          <p>Um administrador precisa preencher sua serie e turma para as missoes aparecerem.</p>
        </section>
      )}

      {!loading && !loadError && missions.length === 0 && (isAdmin || (profile?.grade && profile?.className)) && (
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
          <article className="mission-card" key={mission.id}>
            <div className="mission-orbit" />
            <p className="eyebrow">{mission.targetGrade} · {mission.targetClass}</p>
            <h3>{mission.title}</h3>
            <p>{mission.description}</p>
            <div className="mission-stats">
              <span><Target size={16} /> {mission.questionIds?.length || 0} fases</span>
              <span><Shuffle size={16} /> embaralhada</span>
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
