import React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { getAvatarOption } from "../services/avatarCatalogService";
import { normalizeAvatarLayerOrder } from "../utils/avatarLayers";

export default function AvatarLayerOrderEditor({ categories, catalog, avatar, order, onMove }) {
  const categoriesByKey = new Map((categories || []).map((category) => [category.key, category]));
  const normalizedOrder = normalizeAvatarLayerOrder(order);

  return (
    <section className="avatar-layer-order-panel" aria-label="Ordem das camadas do avatar">
      <div className="avatar-layer-order-heading">
        <strong>Camadas da roupa</strong>
        <span>De baixo para cima. Suba a peca que deve aparecer na frente.</span>
      </div>
      <div className="avatar-layer-order-list">
        {normalizedOrder.map((categoryKey, index) => {
          const label = categoriesByKey.get(categoryKey)?.label || categoryKey;
          const item = getAvatarOption(catalog, categoryKey, avatar?.[categoryKey]);
          const itemLabel = item?.defaultItem ? "Nenhum item equipado" : item?.label || "Nenhum item equipado";
          return (
            <article key={categoryKey}>
              <b>{index + 1}</b>
              <span>
                <strong>{label}</strong>
                <small>{itemLabel}</small>
              </span>
              <div className="avatar-layer-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={index === 0}
                  onClick={() => onMove(categoryKey, "down")}
                  aria-label={`Enviar ${label} para tras`}
                  title="Enviar para tras"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={index === normalizedOrder.length - 1}
                  onClick={() => onMove(categoryKey, "up")}
                  aria-label={`Trazer ${label} para frente`}
                  title="Trazer para frente"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
