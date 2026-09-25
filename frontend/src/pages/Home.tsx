import React, { useEffect, useState } from "react";
import {
  uploadAndExplain,
  type ExplainResult,
  type ExplanationType
} from "../api/client";
import { PredictionCard } from "../components/PredictionCard";
import { ExplanationTabs } from "../components/ExplanationTabs";
import { History } from "../components/History";
import { IntestineModel } from "../components/IntestineModel";
import { saveToHistory } from "../services/historyService";
import { ChatbotSidebar } from "../components/ChatbotSidebar";

const MODEL_OPTIONS = [
  "ensemble",
  "EfficientNetB3",
  "DenseNet121",
  "MobileNetV2",
  "ResNet50"
];

const DEFAULT_EXPLANATIONS: ExplanationType[] = ["gradcam", "lime", "shap"];

const AnalyzeSection: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setImageBase64("");
      setResult(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    
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
              accept="image/*"
              onChange={(e) =>
                onSelectFile(e.target.files?.[0] ?? null)
              }
            />
            <div className="upload-content">
              {previewUrl ? (
                <>
                  <div className="upload-preview-wrapper">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="upload-preview-thumb"
                    />
                    <div className="upload-success-icon">
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
                    </div>
                  </div>
                  <p style={{ margin: "0.5rem 0 0", fontWeight: 600, color: "var(--color-text)" }}>
                    {file?.name || "Image selected"}
                  </p>
                  <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
                    Click to choose a different image
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
                    No image selected. Upload an image above to see the preview.
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

          <div className="analyze-results-column">
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

        {/* History Section */}
        <div id="history" style={{ marginTop: "3rem" }}>
          <History />
        </div>
      </div>

      {/* Floating chatbot available on the analysis page */}
      <ChatbotSidebar currentResult={result} />
    </section>
  );
};

export const Home: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    // Handle hash navigation on mount
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1); // Remove the #
      setTimeout(() => {
        scrollToSection(id);
      }, 100); // Small delay to ensure DOM is ready
    }
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-card">
          <div className="hero-card__header">
            <div className="hero-card__header-content">
              <p className="hero-card__eyebrow">RESEARCH PLATFORM</p>
              <h1 className="hero-card__title">
                Colorectal Cancer
                <br />
                Histology Analysis with XAI
              </h1>
              <p className="hero-card__subtitle">
                Advanced ensemble deep learning models for histology classification
                with explainable AI visualizations. Analyze tissue samples using
                ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121.
              </p>
            </div>
            <div className="hero-card__model-container">
              <IntestineModel />
            </div>
          </div>

          <div className="hero-card__grid">
            <article className="course-card">
              <p className="course-card__label">ENSEMBLE MODELS</p>
              <h2 className="course-card__title">
                Four-model ensemble
                <br />
                for robust predictions
              </h2>
              <p className="course-card__body">
                Combining ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121
                trained on Kather colorectal histology dataset for accurate
                tissue classification across 8 classes.
              </p>
              <button
                className="course-card__cta"
                type="button"
                onClick={() => scrollToSection("features")}
              >
                EXPLORE MODELS
              </button>
            </article>

            <article className="course-card">
              <p className="course-card__label">XAI EXPLANATIONS</p>
              <h2 className="course-card__title">
                Interpretable AI
                <br />
                with multiple methods
              </h2>
              <p className="course-card__body">
                Visualize model decisions using Grad-CAM, LIME, and SHAP
                explanations. Understand which tissue regions drive
                classification predictions.
              </p>
            <button
              className="course-card__cta"
              type="button"
              onClick={() => scrollToSection("analyze")}
            >
              TRY ANALYSIS
            </button>
            </article>
          </div>

          <div className="hero-card__badge">
            <span className="hero-card__badge-label">KATHER DATASET</span>
            <span className="hero-card__badge-time">8 CLASSES</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="inner-page section-spacing">
        <header className="inner-page__header">
          <h1>Features & Capabilities</h1>
          <p>
            Explore the deep learning models, explainable AI methods, and dataset
            information that power this histology analysis platform.
          </p>
        </header>
        <div className="inner-grid">
          <div className="course-card">
            <p className="course-card__label">RESNET50</p>
            <h2 className="course-card__title">
              Residual network architecture
            </h2>
            <p className="course-card__body">
              Deep convolutional network with residual connections, optimized for
              histology image classification with 50 layers of feature extraction.
            </p>
            <button className="course-card__cta" type="button">
              VIEW MODEL
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">MOBILENETV2</p>
            <h2 className="course-card__title">Lightweight mobile architecture</h2>
            <p className="course-card__body">
              Efficient depthwise separable convolutions designed for fast
              inference while maintaining high accuracy on histology tissue
              classification tasks.
            </p>
            <button className="course-card__cta" type="button">
              VIEW MODEL
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">EFFICIENTNETB3</p>
            <h2 className="course-card__title">Compound scaling optimization</h2>
            <p className="course-card__body">
              Balanced scaling of depth, width, and resolution for optimal
              performance on colorectal histology classification with efficient
              resource usage.
            </p>
            <button className="course-card__cta" type="button">
              VIEW MODEL
            </button>
          </div>
          <div className="course-card">
            <p className="course-card__label">DENSENET121</p>
            <h2 className="course-card__title">Dense connectivity pattern</h2>
            <p className="course-card__body">
              Densely connected convolutional layers that maximize feature reuse
              and gradient flow for improved histology tissue classification
              accuracy.
            </p>
            <button className="course-card__cta" type="button">
              VIEW MODEL
            </button>
          </div>
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

      {/* About Section */}
      <section id="about" className="inner-page section-spacing">
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

      {/* Analyze Section */}
      <AnalyzeSection />
    </>
  );
};


