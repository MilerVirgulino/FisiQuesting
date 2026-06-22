import React, { useMemo, useState } from "react";
import { getAvatarOptions } from "../services/avatarCatalogService";
import { userOwnsAvatarItem } from "../services/avatarShopService";

function InventoryItemThumb({ item }) {
  if (item?.src) {
    return <img src={item.src} alt="" />;
  }

  return <span>{item?.label || "Item"}</span>;
}

export default function AvatarInventoryPicker({ categories, catalog, profile, avatar, onChange }) {
  const visibleSections = useMemo(() => (
    (categories || [])
      .map((category) => ({
        category,
        options: getAvatarOptions(catalog, category).filter((option) => (
          userOwnsAvatarItem(profile, category.key, option.id, catalog)
        ))
      }))
      .filter((section) => section.options.length > 0)
  ), [avatar, catalog, categories, profile]);
  const [activeCategoryKey, setActiveCategoryKey] = useState(() => visibleSections[0]?.category.key || "");
  const activeSection = visibleSections.find((section) => section.category.key === activeCategoryKey) || visibleSections[0];

  if (!visibleSections.length) {
    return <p className="muted">Nenhum item disponivel no inventario.</p>;
  }

  return (
    <div className="avatar-inventory">
      <div className="avatar-inventory-tabs" role="tablist" aria-label="Categorias do inventario">
        {visibleSections.map(({ category, options }) => (
          <button
            type="button"
            key={category.key}
            className={activeSection?.category.key === category.key ? "active" : ""}
            onClick={() => setActiveCategoryKey(category.key)}
          >
            <span>{category.label}</span>
            <small>{options.length}</small>
          </button>
        ))}
      </div>

      <div className="avatar-inventory-grid" aria-label={activeSection?.category.label || "Inventario"}>
        {activeSection.options.map((item) => {
          const selected = avatar?.[activeSection.category.key] === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`avatar-inventory-slot ${selected ? "equipped" : ""}`}
              onClick={() => onChange(activeSection.category.key, item.id)}
              title={item.label}
              aria-pressed={selected}
            >
              <span className="avatar-inventory-thumb">
                <InventoryItemThumb item={item} />
              </span>
              <span className="avatar-inventory-name">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
