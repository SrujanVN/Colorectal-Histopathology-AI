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
import { createImagePreviewFromBase64 } from "../api/client";

const HistoryImage: React.FC<{ item: HistoryItem; className: string }> = ({ item, className }) => {
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const isTiff = /tiff?/i.test(item.imageMimeType) || /\.tiff?$/i.test(item.fileName);

  useEffect(() => {
    if (!isTiff) return;
    let active = true;
    let objectUrl: string | null = null;
    createImagePreviewFromBase64(item.imageBase64, item.imageMimeType)
      .then((url) => {
        if (active) {
          objectUrl = url;
          setConvertedUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => setConvertedUrl(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isTiff, item.imageBase64, item.imageMimeType]);

  const src = isTiff
    ? convertedUrl
    : `data:${item.imageMimeType};base64,${item.imageBase64}`;
  if (!src) return <div className={`${className} history-image-placeholder`} aria-label="TIFF image preview" />;
  return <img src={src} alt={item.fileName} className={className} />;
};

interface HistoryProps {
  title?: string;
}

export const History: React.FC<HistoryProps> = ({ title = "Prediction History" }) => {
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
      <div className="card history-panel history-panel--empty">
        <h2 className="card-title">{title}</h2>
        <p className="muted">
          Nothing is saved here yet. Run an image analysis and the result will appear automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="card history-panel">
      <div
        className="history-panel__header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 className="card-title" style={{ margin: 0 }}>
          {title} ({history.length})
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

      <div className="history-list">
        {history.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="history-item"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "var(--color-bg-secondary, rgba(255, 255, 255, 0.02))",
              }}
            >
              {/* History Item Header */}
              <div
                className="history-item__summary"
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
                <HistoryImage item={item} className="history-item__thumbnail" />

                {/* Item Info */}
                <div className="history-item__meta">
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
                  className={`history-item__chevron${isExpanded ? " is-expanded" : ""}`}
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
                  className="history-item__delete"
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
                  className="history-item__details"
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
                        <HistoryImage item={item} className="preview-image" />
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

