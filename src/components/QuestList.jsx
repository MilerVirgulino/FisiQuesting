import React from "react";

export default function QuestList({ quests = [] }) {
  if (!quests.length) {
    return <p className="muted">Nenhuma quest diária ativa por enquanto.</p>;
  }

  return (
    <div className="quest-list">
      {quests.map((quest) => (
        <article className="quest-item" key={quest.id}>
          <div>
            <strong>{quest.title}</strong>
            <span>{quest.description}</span>
          </div>
          <b>+{quest.rewardXp || 0} XP</b>
        </article>
      ))}
    </div>
  );
}
