import React, { useState } from "react";
import {
  uploadAndExplain,
  type ExplainResult,
  type ExplanationType
} from "./api/client";
import { PredictionCard } from "./components/PredictionCard";
import { ExplanationTabs } from "./components/ExplanationTabs";
import { ChatbotSidebar } from "./components/ChatbotSidebar";

const MODEL_OPTIONS = [
  "ensemble",
  "EfficientNetB3",
  "DenseNet121",
  "MobileNetV2",
  "ResNet50"
];

const DEFAULT_EXPLANATIONS: ExplanationType[] = ["gradcam", "lime", "shap"];

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string>("ensemble");
  const [explanations, setExplanations] =
    useState<ExplanationType[]>(DEFAULT_EXPLANATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResult | null>(null);

  const onSelectFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadAndExplain(file, modelName, explanations);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Failed to get prediction");
    } finally {
      setLoading(false);
    }
  };

  const toggleExplanation = (type: ExplanationType) => {
    setExplanations((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="xai-root">
      <header className="app-header">
        <h1>Colorectal Cancer Histology – Ensemble XAI</h1>
        <p>
          ResNet50 · MobileNetV2 · EfficientNet‑B3 · DenseNet121 + Grad‑CAM ·
          LIME · SHAP (GradientShap)
        </p>
      </header>

      <main className="app-main">
        <div className="card anim-card-enter">
          <h2 className="card-title">1. Upload histology patch</h2>
          <p className="muted" style={{ marginTop: "0.25rem" }}>
            Start by selecting a single Kather tile or other colorectal
            histology patch you want to analyze.
          </p>

          <label className="upload-area">
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                onSelectFile(e.target.files?.[0] ?? null)
              }
            />
            <div>
              <div className="upload-icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 3l4.5 4.5-1.4 1.4L13 6.8V16h-2V6.8L8.9 8.9 7.5 7.5 12 3zm-7 14h14v2H5v-2z"
                  />
                </svg>
              </div>
              <p style={{ margin: 0, fontWeight: 500 }}>
                Click to choose a histology patch image
              </p>
              <p className="muted">
                Supported formats: PNG, JPG, TIFF. Ideally use a 224×224 Kather
                tile or UNKNOWN Unsplash image.
              </p>
            </div>
          </label>

          <div className="controls-row">
            <div>
              <label>
                2. Choose model
                <br />
                <select
                  className="select"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m === "ensemble" ? "Ensemble (4 models)" : m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label>
                3. Select explanations
                <div className="checkbox-group">
                  {(["gradcam", "lime", "shap"] as ExplanationType[]).map(
                    (type) => (
                      <label key={type}>
                        <input
                          type="checkbox"
                          checked={explanations.includes(type)}
                          onChange={() => toggleExplanation(type)}
                        />
                        {type === "gradcam" && "Grad‑CAM"}
                        {type === "lime" && "LIME"}
                        {type === "shap" && "SHAP"}
                      </label>
                    )
                  )}
                </div>
              </label>
            </div>
          </div>

          <button
            className="primary-button anim-hover-lift anim-button-press"
            onClick={onSubmit}
            disabled={!file || loading}
          >
            {loading ? "Running inference & explanations..." : "Run analysis"}
          </button>

          {loading && (
            <div className="loading-overlay" role="status" aria-live="polite">
              <div className="loading-spinner" />
              <div className="loading-text">
                Running ensemble inference and generating explanations…
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              style={{
                color: "var(--color-danger)",
                marginTop: "0.75rem",
                fontSize: "0.85rem"
              }}
            >
              {error}
            </p>
          )}
        </div>

        <div className="layout-grid">
          <div>
            <div className="card anim-card-enter">
              <h2 className="card-title">Input image</h2>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="preview-image"
                />
              ) : (
                <p className="muted">
                  No image selected yet. Choose a patch above to preview and
                  analyze.
                </p>
              )}
            </div>
            {result && (
              <>
                <div style={{ height: "1.5rem" }} />
                <ExplanationTabs explain={result} />
              </>
            )}
          </div>

          <div>
            {result ? (
              <PredictionCard prediction={result.prediction} />
            ) : (
              <div className="card">
                <h2 className="card-title">Results & explanations</h2>
                <p className="muted">
                  After you upload an image and start analysis, the prediction
                  and visual explanations will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <span>Colorectal histology ensemble explorer</span>
        <span>·</span>
        <span>Models trained on Kather colorectal histology MNIST dataset</span>
      </footer>

      {/* Floating chatbot, available across the analysis page */}
      <ChatbotSidebar currentResult={result} />
    </div>
  );
};

export default App;


