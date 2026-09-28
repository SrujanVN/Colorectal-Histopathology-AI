import React from "react";
import type { PredictionResult, ExplainResult } from "../api/client";
import { DownloadReportButton } from "./DownloadReportButton";

interface Props {
  prediction: PredictionResult;
  // Optional props for report generation
  fileName?: string;
  modelName?: string;
  timestamp?: number;
  fullResult?: ExplainResult;
  imageBase64?: string;
  imageMimeType?: string;
}

export const PredictionCard: React.FC<Props> = ({
  prediction,
  fileName,
  modelName,
  timestamp,
  fullResult,
  imageBase64,
  imageMimeType,
}) => {
  const { predicted_class, confidence, class_probabilities, per_model_scores } =
    prediction;

  const classEntries = Object.entries(class_probabilities).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="card anim-card-enter result-card">
      <div className="result-card__heading">
        <div>
          <p className="result-card__eyebrow">ANALYSIS RESULT</p>
          <h2 className="card-title">Predicted tissue class</h2>
        </div>
        <span className="result-card__confidence">{(confidence * 100).toFixed(1)}% confidence</span>
      </div>
      <div className="result-card__prediction">
        <span className="result-card__class-mark" aria-hidden="true">✓</span>
        <strong>{predicted_class}</strong>
      </div>

      <div className="result-probabilities">
        <div className="result-probabilities__heading">
          <h3>Class probabilities</h3>
          <span>Soft-voting ensemble</span>
        </div>
        {classEntries.map(([label, prob]) => (
          <div key={label} className="prediction-row">
            <span style={{ minWidth: 90 }}>{label}</span>
            <div className="prob-bar">
              <div
                className="prob-bar-fill"
                style={{ width: `${(prob * 100).toFixed(1)}%` }}
              />
            </div>
            <span style={{ minWidth: 60, textAlign: "right" }}>
              {(prob * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <details className="result-model-details">
        <summary style={{ cursor: "pointer", fontSize: "0.9rem" }}>
          Per‑model probabilities
        </summary>
        <div style={{ marginTop: "0.75rem", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem"
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.25rem" }}>Class</th>
                {per_model_scores.map((m) => (
                  <th
                    key={m.model_name}
                    style={{ textAlign: "right", padding: "0.25rem" }}
                  >
                    {m.model_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classEntries.map(([label]) => (
                <tr key={label}>
                  <td style={{ padding: "0.25rem" }}>{label}</td>
                  {per_model_scores.map((m) => (
                    <td
                      key={m.model_name}
                      style={{
                        padding: "0.25rem",
                        textAlign: "right",
                      color:
                        label === predicted_class
                          ? "var(--color-primary)"
                          : "var(--color-text-muted)"
                      }}
                    >
                      {((m.probabilities[label] ?? 0) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="muted result-card__note">
        Classes follow the Kather colorectal histology scheme (8 tissue types +
        UNKNOWN).
      </p>

      {fullResult && fileName && modelName && timestamp && imageBase64 && imageMimeType && (
        <div className="result-card__download">
          <DownloadReportButton
            fileName={fileName}
            modelName={modelName}
            timestamp={timestamp}
            result={fullResult}
            imageBase64={imageBase64}
            imageMimeType={imageMimeType}
          />
        </div>
      )}
    </div>
  );
};


