import React, { useEffect, useMemo, useState } from "react";
import { Rocket, Shuffle, Target } from "lucide-react";
import QuestionCard from "../components/QuestionCard.jsx";
import { getQuestionsByIds } from "../services/questionService";
import { listOpenMissionsForClass } from "../services/missionService";
import { submitMissionAttempt } from "../services/progressService";
import { useAuth } from "../services/authService.jsx";
import { buildShuffledQuestion, seededShuffle } from "../utils/shuffle";

export default function QuestionsPage() {
  const { firebaseUser, profile } = useAuth();
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [missionResult, setMissionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missionLoading, setMissionLoading] = useState(false);
  const [submittingMission, setSubmittingMission] = useState(false);

  const classLabel = useMemo(() => {
    if (!profile?.grade || !profile?.className) return "turma nao definida";
    return `${profile.grade} - ${profile.className}`;
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    listOpenMissionsForClass({ grade: profile?.grade, className: profile?.className })
      .then(setMissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.grade, profile?.className]);

  async function startMission(mission) {
    setMissionLoading(true);
    setSelectedMission(mission);
    setAnswers({});
    setMissionResult(null);
    try {
      const missionQuestions = await getQuestionsByIds(mission.questionIds || []);
      const shuffledQuestions = seededShuffle(
        missionQuestions,
        `${firebaseUser.uid}_${mission.id}_questions`
      ).map((question) => buildShuffledQuestion(question, `${firebaseUser.uid}_${mission.id}`));
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
    } finally {
      setSubmittingMission(false);
    }
  }

  if (selectedMission) {
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
          }}>
            Voltar
          </button>
        </div>

        {missionLoading && <p className="muted">Sorteando fases da missao...</p>}
        {!missionLoading && questions.map((question, index) => (
          <QuestionCard question={question} onAnswer={handleAnswer} index={index} key={question.id} />
        ))}
        {!missionLoading && questions.length > 0 && (
          <section className="mission-finish">
            <div>
              <strong>{Object.keys(answers).length} de {questions.length} fases respondidas</strong>
              <span>O XP sera gravado apenas ao finalizar a missao.</span>
            </div>
            <button
              type="button"
              disabled={Object.keys(answers).length < questions.length || submittingMission || Boolean(missionResult)}
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
            </p>
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

      {!loading && missions.length === 0 && (
        <section className="empty-state">
          <Target size={36} />
          <h3>Nenhuma missao aberta para sua turma.</h3>
          <p>Quando o professor liberar uma missao semanal, ela aparece aqui.</p>
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
            </div>
            <button type="button" onClick={() => startMission(mission)}>Iniciar quest</button>
          </article>
        ))}
      </div>
    </section>
  );
}
