import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadAndExplain,
  createImagePreview,
  type ExplainResult,
  type ExplanationType
} from "../api/client";
import { PredictionCard } from "../components/PredictionCard";
import { ExplanationTabs } from "../components/ExplanationTabs";
import { History } from "../components/History";
import { Reports } from "../components/Reports";
import { saveToHistory } from "../services/historyService";
import { ChatbotSidebar } from "../components/ChatbotSidebar";

const IntestineModel = lazy(() =>
  import("../components/IntestineModel").then((module) => ({ default: module.IntestineModel }))
);

const MODEL_OPTIONS = [
  "ensemble",
  "EfficientNetB3",
  "DenseNet121",
  "MobileNetV2",
  "ResNet50"
];

const DEFAULT_EXPLANATIONS: ExplanationType[] = ["gradcam", "lime", "shap"];

interface ModelProfile {
  name: string;
  initials: string;
  category: string;
  description: string;
  accuracy: string;
  auc: string;
  kappa: string;
  graph: string;
  totalParams: string;
  trainableParams: string;
  accent: string;
}

const MODEL_PROFILES: ModelProfile[] = [
  { name: "ResNet50", initials: "RN", category: "RESIDUAL", description: "Residual connections support deeper feature extraction for colorectal histology classification.", accuracy: "96.25%", auc: "0.9982", kappa: "0.9577", graph: "resnet50", totalParams: "24.7M", trainableParams: "15.6M", accent: "#55c6e7" },
  { name: "MobileNetV2", initials: "M2", category: "MOBILE", description: "Inverted residual blocks keep histology inference lightweight while preserving classification accuracy.", accuracy: "96.25%", auc: "0.9985", kappa: "0.9577", graph: "mobilenetv2", totalParams: "3.0M", trainableParams: "2.2M", accent: "#27cbd0" },
  { name: "EfficientNet-B3", initials: "EF", category: "EFFICIENT", description: "Compound scaling balances depth, width, and resolution for efficient histology classification.", accuracy: "95.76%", auc: "0.9970", kappa: "0.9523", graph: "efficientnetb3", totalParams: "11.6M", trainableParams: "4.5M", accent: "#68a8f3" },
  { name: "DenseNet121", initials: "DE", category: "DENSE", description: "Dense feature reuse connects each layer to later layers, preserving fine-grained tissue information.", accuracy: "95.64%", auc: "0.9980", kappa: "0.9509", graph: "densenet121", totalParams: "7.6M", trainableParams: "1.3M", accent: "#8279ec" },
];

type ModelChart = "training" | "confusion" | "roc";
const MODEL_CHARTS: { type: ModelChart; label: string }[] = [
  { type: "training", label: "Training history" },
  { type: "confusion", label: "Confusion matrix" },
  { type: "roc", label: "ROC curves" },
];
const MODEL_CHART_LABELS: Record<ModelChart, string> = {
  training: "Training history",
  confusion: "Confusion matrix",
  roc: "ROC curves",
};

const AnalyzeSection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestId = useRef(0);
  const [modelName, setModelName] = useState<string>("ensemble");
  const [explanations, setExplanations] =
    useState<ExplanationType[]>(DEFAULT_EXPLANATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [isDragging, setIsDragging] = useState(false);

  const onSelectFile = async (f: File | null) => {
    previewRequestId.current += 1;
    const requestId = previewRequestId.current;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setPreviewError(null);
      setImageBase64("");
      setResult(null);
      return;
    }
    setFile(f);
    setPreviewUrl(null);
    setPreviewError(null);

    try {
      const url = await createImagePreview(f);
      if (requestId !== previewRequestId.current) {
        URL.revokeObjectURL(url);
        return;
      }
      previewUrlRef.current = url;
      setPreviewUrl(url);
      } catch {
      if (requestId !== previewRequestId.current) return;
      const isTiff = /\.tiff?$/i.test(f.name) || f.type === "image/tiff";
      if (isTiff) {
        setPreviewError("TIFF preview needs the image preview service. You can still run the analysis.");
      } else {
        const url = URL.createObjectURL(f);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      }
    }
    
    // Convert file to base64 for report generation
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [header, base64] = result.split(",");
        const mimeTypeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        setImageBase64(base64);
        setImageMimeType(mimeType);
      };
      reader.readAsDataURL(f);
    } catch (err) {
      console.warn("Failed to convert file to base64:", err);
    }
  };

  useEffect(() => () => {
    previewRequestId.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await uploadAndExplain(file, modelName, explanations);
      setResult(res);
      // Save to history after successful prediction
      try {
        await saveToHistory(file, modelName, explanations, res);
      } catch (historyError) {
        // Log but don't fail the request if history save fails
        console.warn("Failed to save to history:", historyError);
      }
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      onSelectFile(droppedFile);
    }
  };

  return (
    <section id="analyze" className="inner-page section-spacing">
      <header className="inner-page__header">
        <h1>Analyze Histology Images</h1>
        <p>
          Upload a colorectal histology patch to get predictions and explainable
          AI visualizations using our ensemble models.
        </p>
      </header>

      <div className="xai-section">
        {/* Main Upload and Controls Card */}
        <div className="analyze-main-card card anim-card-enter">
          <div className="analyze-card-header">
            <div className="analyze-step-number">1</div>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>
                Upload Histology Patch
              </h2>
              <p className="muted" style={{ marginTop: "0.25rem", marginBottom: 0 }}>
                Select a Kather tile or colorectal histology patch to analyze
              </p>
            </div>
          </div>

          <label
            className={`upload-area ${isDragging ? "upload-area--dragging" : ""} ${previewUrl ? "upload-area--has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*,.tif,.tiff"
              onChange={(e) =>
                onSelectFile(e.target.files?.[0] ?? null)
              }
            />
            <div className="upload-content">
              {file ? (
                <>
                  <div className="upload-preview-wrapper">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Selected histology patch" className="upload-preview-thumb" />
                    ) : (
                      <div className="upload-preview-pending" role="status">
                        {previewError ? "Preview unavailable" : "Preparing preview…"}
                      </div>
                    )}
                    {previewUrl && <div className="upload-success-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#22c55e" />
                        <path
                          d="M8 12l2 2 4-4"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>}
                  </div>
                  <p style={{ margin: "0.5rem 0 0", fontWeight: 600, color: "var(--color-text)" }}>
                    {file.name}
                  </p>
                  <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
                    {previewError || "Click to choose a different image"}
                  </p>
                </>
              ) : (
                <>
                  <div className="upload-icon-circle" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="17 8 12 3 7 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="12"
                        y1="3"
                        x2="12"
                        y2="15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p style={{ margin: "0.75rem 0 0.25rem", fontWeight: 600, fontSize: "1rem" }}>
                    {isDragging ? "Drop image here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                    Supported: PNG, JPG, TIFF • Recommended: 224×224 Kather tile
                  </p>
                </>
              )}
            </div>
          </label>

          {/* Configuration Section */}
          <div className="analyze-config-section">
            <div className="analyze-config-item">
              <div className="analyze-step-number">2</div>
              <div className="analyze-config-content">
                <label className="analyze-config-label">
                  <span className="analyze-config-title">Model Selection</span>
                  <select
                    className="select analyze-select"
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
            </div>

            <div className="analyze-config-item">
              <div className="analyze-step-number">3</div>
              <div className="analyze-config-content">
                <label className="analyze-config-label">
                  <span className="analyze-config-title">Explanation Methods</span>
                  <div className="checkbox-group analyze-checkbox-group">
                    {(["gradcam", "lime", "shap"] as ExplanationType[]).map(
                      (type) => (
                        <label key={type} className="analyze-checkbox-label">
                          <input
                            type="checkbox"
                            checked={explanations.includes(type)}
                            onChange={() => toggleExplanation(type)}
                            className="analyze-checkbox"
                          />
                          <span className="analyze-checkbox-custom" />
                          <span className="analyze-checkbox-text">
                            {type === "gradcam" && "Grad‑CAM"}
                            {type === "lime" && "LIME"}
                            {type === "shap" && "SHAP"}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            className="primary-button analyze-button anim-hover-lift anim-button-press"
            onClick={onSubmit}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <div className="button-spinner" />
                <span>Analyzing image...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: "0.5rem" }}>
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Run Analysis</span>
              </>
            )}
          </button>

          {/* Loading State */}
          {loading && (
            <div className="loading-overlay analyze-loading" role="status" aria-live="polite">
              <div className="loading-spinner" />
              <div className="loading-text">
                Processing image with {modelName} and generating {explanations.length} explanation{explanations.length !== 1 ? "s" : ""}…
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="analyze-error" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="layout-grid analyze-results-grid">
          <div className="analyze-results-column">
            <div className="card anim-card-enter analyze-image-card">
              <div className="analyze-card-header">
                <h2 className="card-title" style={{ margin: 0 }}>Input Image</h2>
              </div>
              {previewUrl ? (
                <div className="preview-image-wrapper">
                  <img
                    src={previewUrl}
                    alt="Histology patch preview"
                    className="preview-image"
                  />
                </div>
              ) : (
                <div className="preview-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" opacity="0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p className="muted" style={{ marginTop: "1rem" }}>
                    {file ? previewError || "Preparing image preview…" : "No image selected. Upload an image above to see the preview."}
                  </p>
                </div>
              )}
            </div>
            {result && (
              <>
                <div style={{ height: "1.5rem" }} />
                <ExplanationTabs explain={result} />
              </>
            )}
          </div>

          <div id="reports" className="analyze-results-column">
            {result ? (
              <PredictionCard
                prediction={result.prediction}
                fileName={file?.name || "unknown"}
                modelName={modelName}
                timestamp={Date.now()}
                fullResult={result}
                imageBase64={imageBase64}
                imageMimeType={imageMimeType}
              />
            ) : (
              <div className="card analyze-results-placeholder">
                <div className="analyze-results-placeholder-content">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" opacity="0.2">
                    <path
                      d="M9 11l3 3L22 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h2 className="card-title" style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                    Results & Explanations
                  </h2>
                  <p className="muted">
                    Upload an image and run analysis to see predictions and AI explanations here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating chatbot available on the analysis page */}
      <ChatbotSidebar currentResult={result} />
    </section>
  );
};

type WorkspacePage = "home" | "analyze" | "models" | "reports" | "history";

export const Home: React.FC<{ page?: WorkspacePage }> = ({ page = "home" }) => {
  const [selectedModel, setSelectedModel] = useState<ModelProfile | null>(null);
  const [selectedChart, setSelectedChart] = useState<ModelChart>("training");
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const destination: Record<string, string> = {
      analyze: "/analyze",
      models: "/models",
      reports: "/reports",
      history: "/history",
    };
    navigate(destination[id] ?? "/");
  };

  return (
    <>
      {/* Hero Section */}
      {page === "home" && <>
      <section id="hero" className="hero">
        <div className="hero-card">
          <div className="hero-card__header">
            <div className="hero-card__header-content">
              <h1 className="hero-card__title">
                Colorectal
                <br />
                Histopathology
                <br />
                Analysis
              </h1>
              <p className="hero-card__subtitle">
                Evaluate colorectal histology tissue patches using a soft-voting
                ensemble of 4 deep learning architectures (ResNet50, DenseNet121,
                EfficientNet-B3, MobileNetV2) paired with Grad-CAM, LIME, and SHAP
                visual explainability heatmaps.
              </p>
              <div className="hero-actions">
                <button className="hero-action" type="button" onClick={() => scrollToSection("analyze")}>
                  Start Analysis <span aria-hidden="true">→</span>
                </button>
                <button className="hero-action" type="button" onClick={() => scrollToSection("models")}>
                  Explore Models
                </button>
              </div>
            </div>
            <div className="hero-card__model-container">
              <Suspense fallback={<div className="model-canvas-fallback">Preparing the colorectal model…</div>}>
                <IntestineModel />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="model-performance" aria-labelledby="model-performance-title">
        <div className="model-performance__panel">
          <div className="model-performance__header">
            <div>
              <p className="model-performance__eyebrow">MODEL PERFORMANCE</p>
              <h2 id="model-performance-title">Four models, one transparent ensemble</h2>
              <p>
                Notebook-reported test accuracy from the 826-image held-out split.
                See the full graphs, metrics, and explanation methods in Models.
              </p>
            </div>
            <button className="model-performance__link" type="button" onClick={() => scrollToSection("models")}>
              View full model details <span aria-hidden="true">›</span>
            </button>
          </div>
          <div className="model-performance__grid">
            {MODEL_PROFILES.map((model) => (
              <button
                className="model-performance__stat"
                key={model.name}
                type="button"
                onClick={() => setSelectedModel(model)}
              >
                <span>{model.name}</span>
                <strong>{model.accuracy}</strong>
                <small>TEST ACCURACY</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      </>}

      {/* Features Section */}
      {page === "models" && <section id="models" className="inner-page section-spacing">
        <header className="inner-page__header">
          <h1>Models &amp; Explainability</h1>
          <p>
            Four image classifiers vote together on colorectal tissue patches.
            Explore the notebook-backed evaluation results and understand what
            each explanation method highlights.
          </p>
        </header>

        <div className="model-summary-grid">
          <article className="model-summary-card">
            <strong>5,500</strong>
            <b>total samples</b>
            <span>8 Kather tissue classes + UNKNOWN</span>
          </article>
          <article className="model-summary-card">
            <strong>70 / 15 / 15</strong>
            <b>train / validation / test</b>
            <span>Test split contains 826 images</span>
          </article>
          <article className="model-summary-card">
            <strong>4 models</strong>
            <b>soft-voting ensemble</b>
            <span>Probabilities are averaged per class</span>
          </article>
          <article className="model-summary-card">
            <strong>9 classes</strong>
            <b>classification labels</b>
            <span>Includes an out-of-distribution UNKNOWN class</span>
          </article>
        </div>

        <section className="model-comparison-card" aria-labelledby="model-comparison-title">
          <div className="model-comparison-card__header">
            <div>
              <p className="model-performance__eyebrow">NOTEBOOK EVALUATION</p>
              <h2 id="model-comparison-title">Test accuracy and model comparison</h2>
            </div>
            <span className="model-comparison-card__badge">Reported test split · n=826</span>
          </div>
          <div className="model-comparison-list">
            {MODEL_PROFILES.map((model) => (
              <div className="model-comparison-row" key={model.name}>
                <strong>{model.name}</strong>
                <div className="model-comparison-track" aria-label={`${model.accuracy} test accuracy`}>
                  <span style={{ width: model.accuracy, background: model.accent }} />
                </div>
                <div className="model-comparison-meta">
                  <b>{model.accuracy}</b>
                  <span className="model-comparison-auc">AUC {model.auc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="model-comparison-card__note">
            Values are taken from the executed training notebooks. They are not a guarantee of future clinical performance and should be read with the split, class balance, and dataset limitations in mind.
          </p>
        </section>

        <div className="model-detail-grid">
          {MODEL_PROFILES.map((model) => (
            <article className="model-detail-card" key={model.name}>
              <header className="model-detail-card__header">
                <span className="model-detail-card__icon" style={{ background: model.accent }}>{model.initials}</span>
                <div>
                  <p>{model.category}</p>
                  <h2>{model.name}</h2>
                </div>
              </header>
              <p className="model-detail-card__description">{model.description}</p>
              <div className="model-detail-card__metrics">
                <div><strong>{model.accuracy}</strong><span>test accuracy</span></div>
                <div><strong>{model.auc}</strong><span>mean AUC</span></div>
                <div><strong>{model.kappa}</strong><span>Cohen&apos;s kappa</span></div>
              </div>
              <p className="model-detail-card__parameters">
                {model.totalParams} total · {model.trainableParams} trainable
              </p>
              <div className="notebook-graphs">
                <div className="notebook-graphs__header">
                  <h3>Notebook graphs</h3>
                  <span>Training · confusion · ROC</span>
                </div>
                <div className="notebook-graphs__grid">
                  {MODEL_CHARTS.map((chart) => (
                    <button
                      className="notebook-graph-preview"
                      key={chart.type}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model);
                        setSelectedChart(chart.type);
                      }}
                    >
                      <img src={`/model-graphs/${model.graph}-${chart.type}.png`} alt={`${model.name} ${chart.label}`} />
                      <span>{chart.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <h2 className="explainability-section-title">Explainability methods</h2>
        <div className="inner-grid">
          <div className="course-card">
            <p className="course-card__label">GRAD-CAM</p>
            <h2 className="course-card__title">Gradient-weighted activation maps</h2>
            <p className="course-card__body">
              Visualize which regions of the histology image contribute most to
              the model&apos;s classification decision using gradient-based
              attention visualization.
            </p>
            <button
              className="course-card__cta"
              type="button"
              onClick={() => scrollToSection("analyze")}
            >
              TRY IT
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">LIME</p>
            <h2 className="course-card__title">Local interpretable explanations</h2>
            <p className="course-card__body">
              Understand model predictions by approximating the decision boundary
              locally around individual histology samples using interpretable
              linear models.
            </p>
            <button
              className="course-card__cta"
              type="button"
              onClick={() => scrollToSection("analyze")}
            >
              TRY IT
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">SHAP</p>
            <h2 className="course-card__title">SHapley Additive exPlanations</h2>
            <p className="course-card__body">
              Game-theory based feature attribution method using GradientShap to
              explain how each pixel contributes to the final classification
              prediction.
            </p>
            <button
              className="course-card__cta"
              type="button"
              onClick={() => scrollToSection("analyze")}
            >
              TRY IT
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">KATHER DATASET</p>
            <h2 className="course-card__title">Colorectal histology tiles</h2>
            <p className="course-card__body">
              Trained on the Kather colorectal histology dataset with 8 tissue
              classes: Adipose, Background, Debris, Lymphocytes, Mucus, Smooth
              Muscle, Normal Colon, and Cancer-associated Stroma.
            </p>
            <button className="course-card__cta" type="button">
              LEARN MORE
            </button>
          </div>
        </div>
      </section>
      }

      {/* About Section */}
      {false && <section id="about" className="inner-page section-spacing">
        <header className="inner-page__header">
          <h1>About the Project</h1>
          <p>
            A research platform for colorectal cancer histology classification
            using ensemble deep learning models and explainable AI methods.
          </p>
        </header>

        <div className="inner-grid inner-grid--single">
          <div className="about-card">
            <h2>Project Overview</h2>
            <p>
              This platform combines four state-of-the-art convolutional neural
              networks (ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121) in
              an ensemble approach to classify colorectal histology tissue samples.
              The system provides explainable AI visualizations using Grad-CAM,
              LIME, and SHAP to help researchers understand model predictions.
            </p>

            <h2 style={{ marginTop: "1.5rem" }}>Dataset</h2>
            <p>
              Models are trained on the Kather colorectal histology dataset,
              containing tissue tiles classified into 8 categories: Adipose,
              Background, Debris, Lymphocytes, Mucus, Smooth Muscle, Normal Colon
              Mucosa, and Cancer-associated Stroma. The dataset enables robust
              classification of colorectal tissue types.
            </p>

            <h2 style={{ marginTop: "1.5rem" }}>Architecture</h2>
            <p>
              The backend uses FastAPI to serve PyTorch models, while the frontend
              is built with React and TypeScript. The ensemble approach combines
              predictions from all four models for improved accuracy and
              robustness. Explainable AI methods provide visual insights into
              model decision-making processes.
            </p>

            <h2 style={{ marginTop: "1.5rem" }}>Get in touch</h2>
            <p>
              Interested in collaboration or have questions about the research?
              Send us a message and we&apos;ll get back to you.
            </p>
            <form
              className="contact-form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <label>
                Name
                <input type="text" placeholder="Your name" />
              </label>
              <label>
                Email
                <input type="email" placeholder="you@example.com" />
              </label>
              <label>
                Message
                <textarea
                  rows={4}
                  placeholder="Tell us about your research interests or collaboration ideas"
                />
              </label>
              <button className="course-card__cta" type="submit">
                SEND MESSAGE
              </button>
            </form>
          </div>
        </div>
      </section>
      }

      {/* Analyze Section */}
      {page === "analyze" && <AnalyzeSection />}

      {(page === "reports" || page === "history") && (
        <section className={`inner-page section-spacing workspace-page workspace-page--${page}`}>
          <header className="inner-page__header">
            <p className="page-eyebrow">{page === "reports" ? "DOCUMENT CENTER" : "WORKSPACE ACTIVITY"}</p>
            <h1>{page === "reports" ? "Reports" : "Analysis history"}</h1>
            <p>
              {page === "reports"
                ? "Turn a saved result into a clear, downloadable PDF report."
                : "Revisit earlier image analyses, inspect their explanations, or remove records you no longer need."}
            </p>
          </header>
          {page === "reports" ? <Reports /> : <History title="Saved analyses" />}
        </section>
      )}

      {selectedModel && (
        <div className="model-dialog-backdrop" onMouseDown={() => setSelectedModel(null)}>
          <section
            className="model-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="model-dialog__header">
              <h2 id="model-dialog-title">{selectedModel.name} · {MODEL_CHART_LABELS[selectedChart]}</h2>
              <button type="button" className="model-dialog__close" onClick={() => setSelectedModel(null)}>
                Close
              </button>
            </div>
            <img
              className="model-dialog__chart"
              src={`/model-graphs/${selectedModel.graph}-${selectedChart}.png`}
              alt={`${selectedModel.name} ${MODEL_CHART_LABELS[selectedChart]}`}
            />
            <p className="model-dialog__footer">
              Click outside the graph or use Close to return to the Models page.
            </p>
          </section>
        </div>
      )}
    </>
  );
};


