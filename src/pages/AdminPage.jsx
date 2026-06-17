import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, GripVertical, Lock, RadioTower, Trash2, Users } from "lucide-react";
import { approveUser, listUsers, rejectUser, updateUserClass } from "../services/adminService";
import { createMission, listAllMissions, updateMission } from "../services/missionService";
import { createQuestion, deleteQuestion, listAllQuestions, updateQuestion } from "../services/questionService";

const areas = ["Mecanica", "Termologia", "Optica", "Eletricidade", "Ondulatoria", "Fisica Moderna"];
const difficulties = ["facil", "medio", "dificil"];

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
  status: "open",
  startsAt: "",
  endsAt: ""
};

const tabs = [
  { id: "missions", label: "Missoes", icon: RadioTower },
  { id: "questions", label: "Questoes", icon: BookOpen },
  { id: "classes", label: "Turmas", icon: Users },
  { id: "analytics", label: "Graficos", icon: BarChart3 }
];

function buildClassStats(users) {
  const groups = new Map();
  users
    .filter((user) => user.role !== "admin")
    .forEach((user) => {
      const key = `${user.grade || "Sem serie"} - ${user.className || "Sem turma"}`;
      const current = groups.get(key) || { key, students: 0, solved: 0, correct: 0, xp: 0 };

      current.students += 1;
      current.solved += user.solvedCount || 0;
      current.correct += user.correctCount || 0;
      current.xp += user.totalXp || 0;
      groups.set(key, current);
    });

  return [...groups.values()].map((group) => ({
    ...group,
    accuracy: group.solved ? Math.round((group.correct / group.solved) * 100) : 0,
    avgXp: group.students ? Math.round(group.xp / group.students) : 0
  }));
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("missions");
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [question, setQuestion] = useState(initialQuestion);
  const [mission, setMission] = useState(initialMission);
  const [loadErrors, setLoadErrors] = useState([]);
  const [draggingQuestionId, setDraggingQuestionId] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [questionFilters, setQuestionFilters] = useState({ area: "", difficulty: "" });
  const [editingQuestion, setEditingQuestion] = useState(null);

  const classStats = useMemo(() => buildClassStats(users), [users]);
  const maxSolved = Math.max(1, ...classStats.map((item) => item.solved));
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
      listAllMissions()
    ]);
    const labels = ["usuarios", "questoes", "missoes"];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        errors.push(`${labels[index]}: ${result.reason?.message || "falha de permissao"}`);
        return;
      }

      if (index === 0) setUsers(result.value);
      if (index === 1) setQuestions(result.value);
      if (index === 2) setMissions(result.value);
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
                  <input
                    value={mission.targetGrade}
                    onChange={(event) => setMission({ ...mission, targetGrade: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Turma
                  <input
                    value={mission.targetClass}
                    onChange={(event) => setMission({ ...mission, targetClass: event.target.value })}
                    required
                  />
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
                  Status
                  <select value={mission.status} onChange={(event) => setMission({ ...mission, status: event.target.value })}>
                    <option value="open">Aberta</option>
                    <option value="closed">Fechada</option>
                  </select>
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
            <div className="table-list">
              {missions.map((item) => (
                <article className="table-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.targetGrade} · {item.targetClass} · {item.questionIds?.length || 0} questoes · {item.status}</span>
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
                  <input
                    aria-label="Serie"
                    placeholder="Serie"
                    defaultValue={user.grade || ""}
                    onBlur={(event) => updateUserClass(user.id, { grade: event.target.value, className: user.className || "" }).then(refresh)}
                  />
                  <input
                    aria-label="Turma"
                    placeholder="Turma"
                    defaultValue={user.className || ""}
                    onBlur={(event) => updateUserClass(user.id, { grade: user.grade || "", className: event.target.value }).then(refresh)}
                  />
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => approveUser(user.id, {
                    grade: user.grade || "1 ano",
                    className: user.className || "A"
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

      {activeTab === "analytics" && (
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
