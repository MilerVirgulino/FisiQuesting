import React, { useState } from "react";

export default function QuestionCard({ question, onAnswer, index }) {
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState(null);
  const alternatives =
    question.displayAlternatives || question.alternatives?.map((text, originalIndex) => ({ text, originalIndex })) || [];

  async function handleSubmit(event) {
    event.preventDefault();
    if (selected === "") return;
    const answerResult = await onAnswer(question, Number(selected));
    setResult(answerResult);
  }

  return (
    <article className="question-card">
      <div className="question-meta">
        {typeof index === "number" && <span>Fase {index + 1}</span>}
        <span>{question.area}</span>
        <span>{question.difficulty}</span>
        <strong>+{question.xp} XP</strong>
      </div>
      <h2>{question.statement}</h2>
      <form onSubmit={handleSubmit} className="answer-form">
        {alternatives.map((alternative, optionIndex) => (
          <label className="answer-option" key={`${question.id}-${optionIndex}`}>
            <input
              type="radio"
              name={`answer-${question.id}`}
              value={alternative.originalIndex}
              disabled={Boolean(result)}
              checked={String(selected) === String(alternative.originalIndex)}
              onChange={(event) => setSelected(event.target.value)}
            />
            <span>{alternative.text}</span>
          </label>
        ))}
        <button type="submit" disabled={selected === "" || Boolean(result)}>
          Responder
        </button>
      </form>
      {result && (
        <div className={result.correct ? "feedback correct" : "feedback wrong"}>
          <strong>
            {result.alreadyAnswered
              ? "Questao ja respondida nesta missao"
              : result.correct
                ? `Correto, +${result.xpEarned} XP`
                : "Ainda nao foi desta vez"}
          </strong>
          <p>{question.explanation}</p>
        </div>
      )}
    </article>
  );
}
