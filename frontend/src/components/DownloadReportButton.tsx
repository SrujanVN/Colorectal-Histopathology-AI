import React, { useState } from "react";
import { generateMedicalReport, type PatientInfo } from "../services/reportService";
import { PatientInfoModal } from "./PatientInfoModal";
import type { ExplainResult } from "../api/client";

interface Props {
  fileName: string;
  modelName: string;
  timestamp: number;
  result: ExplainResult;
  imageBase64: string;
  imageMimeType: string;
}

export const DownloadReportButton: React.FC<Props> = ({
  fileName,
  modelName,
  timestamp,
  result,
  imageBase64,
  imageMimeType,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (patientInfo: PatientInfo) => {
    setIsModalOpen(false);
    setIsGenerating(true);
    setError(null);

    try {
      await generateMedicalReport(
        patientInfo,
        fileName,
        modelName,
        timestamp,
        result,
        imageBase64,
        imageMimeType
      );
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      setError(err.message || "Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={isGenerating}
        className="primary-button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          width: "100%",
          justifyContent: "center",
        }}
      >
        {isGenerating ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Generating PDF...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Medical Report
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            color: "var(--color-danger)",
            marginTop: "0.5rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </p>
      )}

      <PatientInfoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleDownload}
        defaultDate={new Date(timestamp).toLocaleDateString()}
      />

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

