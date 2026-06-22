import React from "react";

function normalizeOption(option) {
  if (typeof option === "string") {
    return { value: option, label: option };
  }
  return option;
}

export default function ChoicePills({ label, value, options, onChange, className = "", disabled = false }) {
  const normalizedOptions = (options || []).map(normalizeOption);

  return (
    <div className={`choice-pills ${className}`.trim()}>
      {label && <span className="choice-pills-label">{label}</span>}
      <div className="choice-pills-options" role="group" aria-label={label || "Opcoes"}>
        {normalizedOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={String(value) === String(option.value) ? "active" : ""}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
