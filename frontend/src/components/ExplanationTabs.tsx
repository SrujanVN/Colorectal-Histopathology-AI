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
  const captions: Record<TabKey, string> = {
    gradcam: "Highlights image regions that most influenced the selected model’s prediction.",
    lime: "Outlines image superpixels that locally support or oppose the prediction.",
    shap: "Color intensity shows relative pixel attribution over the original tissue patch.",
  };

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
    <div className="card explanation-card">
      <div className="explanation-card__heading">
        <div>
          <p className="result-card__eyebrow">MODEL INTERPRETATION</p>
          <h2 className="card-title">Explanations</h2>
        </div>
        <span>Visual attribution</span>
      </div>
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
      <div className="explanation-viewer">
        {renderImg()}
      </div>
      {active && <p className="explanation-caption">{captions[active]}</p>}
    </div>
  );
};


