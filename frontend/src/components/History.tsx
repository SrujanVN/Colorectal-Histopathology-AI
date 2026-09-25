import React, { useState, useEffect } from "react";
import {
  getHistory,
  deleteHistoryItem,
  clearHistory,
  type HistoryItem,
} from "../services/historyService";
import { PredictionCard } from "./PredictionCard";
import { ExplanationTabs } from "./ExplanationTabs";
import { DownloadReportButton } from "./DownloadReportButton";

export const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = () => {
    setHistory(getHistory());
  };

  useEffect(() => {
    loadHistory();
    // Listen for storage events to update when history changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "colorectal_history") {
        loadHistory();
      }
    };
    // Listen for custom event to update when history changes in same tab
    const handleHistoryUpdate = () => {
      loadHistory();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("historyUpdated", handleHistoryUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("historyUpdated", handleHistoryUpdate);
    };
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this history item?")) {
      deleteHistoryItem(id);
      loadHistory();
      if (expandedId === id) {
        setExpandedId(null);
      }
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all history? This cannot be undone."
      )
    ) {
      clearHistory();
      loadHistory();
      setExpandedId(null);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (history.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Prediction History</h2>
        <p className="muted">
          Your prediction history will appear here. Each time you analyze an
          image, it will be saved automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 className="card-title" style={{ margin: 0 }}>
          Prediction History ({history.length})
        </h2>
        <button
          className="primary-button"
          onClick={handleClearAll}
          style={{
            fontSize: "0.85rem",
            padding: "0.5rem 1rem",
            backgroundColor: "var(--color-danger)",
          }}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {history.map((item) => {
          const isExpanded = expandedId === item.id;
          const imageUrl = `data:${item.imageMimeType};base64,${item.imageBase64}`;

          return (
            <div
              key={item.id}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "var(--color-bg-secondary, rgba(255, 255, 255, 0.02))",
              }}
            >
              {/* History Item Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : item.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Thumbnail */}
                <img
                  src={imageUrl}
                  alt={item.fileName}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    flexShrink: 0,
                  }}
                />

                {/* Item Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: "1rem" }}>
                      {item.result.prediction.predicted_class}
                    </strong>
                    <span className="muted">
                      {(item.result.prediction.confidence * 100).toFixed(1)}%
                      confidence
                    </span>
                  </div>
                  <p
                    className="muted"
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.fileName}
                  </p>
                  <p
                    className="muted"
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.8rem",
                    }}
                  >
                    Model: {item.modelName === "ensemble" ? "Ensemble (4 models)" : item.modelName} • {formatTimestamp(item.timestamp)}
                  </p>
                </div>

                {/* Expand/Collapse Icon */}
                <div
                  style={{
                    fontSize: "1.5rem",
                    color: "var(--color-text-muted)",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  ▼
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "var(--color-danger)",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-danger, rgba(255, 0, 0, 0.1))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  aria-label="Delete history item"
                  title="Delete this history item"
                >
                  ×
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    padding: "1.5rem",
                    backgroundColor: "var(--color-bg, rgba(0, 0, 0, 0.02))",
                  }}
                >
                  <div className="layout-grid">
                    <div>
                      <div className="card">
                        <h3 className="card-title">Input Image</h3>
                        <img
                          src={imageUrl}
                          alt={item.fileName}
                          className="preview-image"
                        />
                      </div>
                      <div style={{ height: "1.5rem" }} />
                      <ExplanationTabs explain={item.result} />
                    </div>
                    <div>
                      <PredictionCard
                        prediction={item.result.prediction}
                        fileName={item.fileName}
                        modelName={item.modelName}
                        timestamp={item.timestamp}
                        fullResult={item.result}
                        imageBase64={item.imageBase64}
                        imageMimeType={item.imageMimeType}
                      />
                      <div style={{ marginTop: "1rem" }}>
                        <DownloadReportButton
                          fileName={item.fileName}
                          modelName={item.modelName}
                          timestamp={item.timestamp}
                          result={item.result}
                          imageBase64={item.imageBase64}
                          imageMimeType={item.imageMimeType}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

