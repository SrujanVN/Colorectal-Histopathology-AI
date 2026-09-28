import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DownloadReportButton } from "./DownloadReportButton";
import { getHistory, type HistoryItem } from "../services/historyService";

const formatDate = (timestamp: number) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(timestamp));

export const Reports: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setItems(getHistory());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("historyUpdated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("historyUpdated", refresh);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [
      item.fileName,
      item.result.prediction.predicted_class,
      item.modelName,
    ].some((value) => value.toLowerCase().includes(normalized)));
  }, [items, query]);

  return (
    <section className="reports-library" aria-labelledby="reports-title">
      <div className="reports-library__toolbar">
        <div>
          <p className="page-eyebrow">REPORT LIBRARY</p>
          <h2 id="reports-title">Export a saved analysis</h2>
          <p>Each PDF is prepared from its saved image, prediction, and explanation results.</p>
        </div>
        <label className="reports-search">
          <span className="sr-only">Search saved analyses</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, class, model" />
        </label>
      </div>

      <div className="reports-library__summary">
        <span><strong>{items.length}</strong> saved {items.length === 1 ? "analysis" : "analyses"}</span>
        <span>PDF reports are generated when you choose an export</span>
      </div>

      {items.length === 0 ? (
        <div className="reports-empty">
          <span className="reports-empty__icon" aria-hidden="true">▤</span>
          <h3>No saved analyses to export</h3>
          <p>After an analysis is saved, its report options will be collected here.</p>
          <Link className="reports-primary-link" to="/analyze">Start an analysis <span aria-hidden="true">→</span></Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="reports-empty reports-empty--compact"><h3>No matches</h3><p>Try another file name, tissue class, or model.</p></div>
      ) : (
        <div className="report-record-list" aria-label="Saved PDF report exports">
          <div className="report-record report-record--heading" aria-hidden="true">
            <span>Analysis file</span><span>Classification</span><span>Saved</span><span>Export</span>
          </div>
          {filteredItems.map((item) => (
            <article className="report-record" key={item.id}>
              <div className="report-record__details">
                <h3><span className="report-record__icon" aria-hidden="true">PDF</span>{item.fileName}</h3>
                <p>{item.modelName === "ensemble" ? "4-model ensemble" : item.modelName}</p>
              </div>
              <div className="report-record__classification">
                <strong>{item.result.prediction.predicted_class}</strong>
                <span>{(item.result.prediction.confidence * 100).toFixed(1)}% confidence</span>
              </div>
              <time className="report-record__date" dateTime={new Date(item.timestamp).toISOString()}>{formatDate(item.timestamp)}</time>
              <div className="report-record__action">
                <DownloadReportButton
                  fileName={item.fileName}
                  modelName={item.modelName}
                  timestamp={item.timestamp}
                  result={item.result}
                  imageBase64={item.imageBase64}
                  imageMimeType={item.imageMimeType}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
