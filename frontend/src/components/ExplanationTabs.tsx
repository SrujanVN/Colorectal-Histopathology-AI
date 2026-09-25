import React, { useState } from "react";
import type { ExplainResult } from "../api/client";

type TabKey = "gradcam" | "lime" | "shap";

interface Props {
  explain: ExplainResult;
}

export const ExplanationTabs: React.FC<Props> = ({ explain }) => {
  const availableTabs: TabKey[] = [];
  if (explain.gradcam) availableTabs.push("gradcam");
  if (explain.lime) availableTabs.push("lime");
  if (explain.shap) availableTabs.push("shap");

  const [active, setActive] = useState<TabKey | null>(
    availableTabs[0] ?? null
  );

  if (!availableTabs.length) {
    return (
      <div className="card">
        <h2 className="card-title">Explanations</h2>
        <p className="muted">
          No explanation types were requested. Enable Grad‑CAM, LIME, or SHAP
          and run again.
        </p>
      </div>
    );
  }

  const renderImg = () => {
    if (active === "gradcam" && explain.gradcam) {
      return (
        <img
          className="explanation-image anim-tab-content"
          src={`data:image/png;base64,${explain.gradcam.heatmap_base64}`}
          alt="Grad-CAM"
        />
      );
    }
    if (active === "lime" && explain.lime) {
      return (
        <img
          className="explanation-image anim-tab-content"
          src={`data:image/png;base64,${explain.lime.overlay_base64}`}
          alt="LIME"
        />
      );
    }
    if (active === "shap" && explain.shap) {
      return (
        <img
          className="explanation-image anim-tab-content"
          src={`data:image/png;base64,${explain.shap.heatmap_base64}`}
          alt="SHAP"
        />
      );
    }
    return null;
  };

  return (
    <div className="card">
      <h2 className="card-title">Explanations</h2>
      <div className="tabs">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            className={
              "tab " + (active === tab ? "tab--active" : "")
            }
            onClick={() => setActive(tab)}
          >
            {tab === "gradcam" && "Grad‑CAM"}
            {tab === "lime" && "LIME"}
            {tab === "shap" && "SHAP (GradientShap)"}
          </button>
        ))}
      </div>
      {renderImg()}
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Grad‑CAM highlights regions that most influenced the prediction, LIME
        shows important superpixels, and SHAP (GradientShap) shows pixel‑level
        contributions.
      </p>
    </div>
  );
};


