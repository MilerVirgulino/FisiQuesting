import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import AvatarPreview from "./AvatarPreview.jsx";
import { getAvatarOptions } from "../services/avatarCatalogService";
import { userOwnsAvatarItem } from "../services/avatarShopService";

function InventoryItemThumb({ item }) {
  if (item?.src) {
    return <img src={item.src} alt="" />;
  }

  return <span>{item?.label || "Item"}</span>;
}

function itemAuthorLabel(item) {
  if (item?.creatorName) return `por ${item.creatorName}`;
  if (item?.defaultItem) return "item do sistema";
  return "autor nao informado";
}

function buildEquipmentSections(categories, catalog, profile) {
  return (categories || [])
    .flatMap((category) => {
      const options = getAvatarOptions(catalog, category).filter((option) => (
        userOwnsAvatarItem(profile, category.key, option.id, catalog)
      ));
      if (!options.length) return [];

      if (category.key !== "accessories") {
        return [{
          slotKey: category.key,
          avatarKey: category.key,
          category,
          label: category.label,
          options
        }];
      }

      return [
        {
          slotKey: "accessories",
          avatarKey: "accessories",
          category,
          label: "Acessorio 1",
          options
        },
        {
          slotKey: "accessories2",
          avatarKey: "accessories2",
          category,
          label: "Acessorio 2",
          options
        }
      ];
    });
}

export default function AvatarInventoryPicker({ categories, catalog, profile, avatar, onChange }) {
  const visibleSections = useMemo(() => (
    buildEquipmentSections(categories, catalog, profile)
  ), [catalog, categories, profile]);
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const activeSection = visibleSections.find((section) => section.slotKey === activeCategoryKey) || visibleSections[0];

  if (!visibleSections.length) {
    return <p className="muted">Nenhum item disponivel no inventario.</p>;
  }

  return (
    <div className="avatar-equipment">
      <div className="avatar-equipment-board">
        <div className="avatar-equipment-preview">
          <AvatarPreview avatar={avatar} size={190} catalog={catalog} />
        </div>

        <div className="avatar-equipment-slots" aria-label="Slots de equipamento">
          {visibleSections.map(({ slotKey, avatarKey, category, label, options }) => {
            const equippedItem = getAvatarOptions(catalog, category).find((item) => item.id === avatar?.[avatarKey]) || options[0];
            return (
              <button
                type="button"
                key={slotKey}
                className={`avatar-equipment-slot slot-${slotKey} ${activeCategoryKey === slotKey ? "active" : ""}`}
                onClick={() => setActiveCategoryKey(slotKey)}
                aria-expanded={activeCategoryKey === slotKey}
              >
                <span className="avatar-equipment-slot-thumb">
                  <InventoryItemThumb item={equippedItem} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{equippedItem?.label || "Escolher item"}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeCategoryKey && activeSection && (
        <div className="avatar-inventory-popover" role="dialog" aria-label={`Itens de ${activeSection.label}`}>
          <div className="avatar-inventory-popover-header">
            <div>
              <strong>{activeSection.label}</strong>
              <span>{activeSection.options.length} item(ns) disponivel(is)</span>
            </div>
            <button type="button" className="secondary" onClick={() => setActiveCategoryKey("")} aria-label="Fechar inventario">
              <X size={18} />
            </button>
          </div>

          <div className="avatar-inventory-grid" aria-label={activeSection.category.label || "Inventario"}>
            {activeSection.options.map((item) => {
              const selectedInSlot = avatar?.[activeSection.avatarKey] === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`avatar-inventory-slot ${selectedInSlot ? "equipped" : ""}`}
                  onClick={() => {
                    onChange(activeSection.category.key, item.id, activeSection.avatarKey);
                    setActiveCategoryKey("");
                  }}
                  title={item.label}
                  aria-pressed={selectedInSlot}
                >
                  <span className="avatar-inventory-thumb">
                    <InventoryItemThumb item={item} />
                  </span>
                  <span className="avatar-inventory-info">
                    <strong>{item.label}</strong>
                    <small>{itemAuthorLabel(item)}</small>
                    <em>{item.description || "Sem descricao."}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
