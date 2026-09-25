import React, { useState, useEffect } from "react";
import type { PatientInfo } from "../services/reportService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patientInfo: PatientInfo) => void;
  defaultDate?: string;
}

export const PatientInfoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
}) => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: "",
    patientId: "",
    date: defaultDate || new Date().toLocaleDateString(),
    physician: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setPatientInfo({
        name: "",
        patientId: "",
        date: defaultDate || new Date().toLocaleDateString(),
        physician: "",
        notes: "",
      });
    }
  }, [isOpen, defaultDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(patientInfo);
  };

  const handleSkip = () => {
    onSubmit({
      name: "",
      patientId: "",
      date: defaultDate || new Date().toLocaleDateString(),
      physician: "",
      notes: "",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 className="card-title" style={{ margin: 0 }}>
            Patient Information
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "0.25rem 0.5rem",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="muted" style={{ marginBottom: "1rem" }}>
          Fill in patient information for the medical report. All fields are
          optional.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            Patient Name
            <input
              type="text"
              value={patientInfo.name}
              onChange={(e) =>
                setPatientInfo({ ...patientInfo, name: e.target.value })
              }
              placeholder="Enter patient name"
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            Patient ID
            <input
              type="text"
              value={patientInfo.patientId}
              onChange={(e) =>
                setPatientInfo({ ...patientInfo, patientId: e.target.value })
              }
              placeholder="Enter patient ID"
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            Date
            <input
              type="date"
              value={
                patientInfo.date
                  ? new Date(patientInfo.date).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
              onChange={(e) =>
                setPatientInfo({
                  ...patientInfo,
                  date: new Date(e.target.value).toLocaleDateString(),
                })
              }
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            Physician
            <input
              type="text"
              value={patientInfo.physician}
              onChange={(e) =>
                setPatientInfo({ ...patientInfo, physician: e.target.value })
              }
              placeholder="Enter physician name"
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1.5rem" }}>
            Additional Notes
            <textarea
              value={patientInfo.notes}
              onChange={(e) =>
                setPatientInfo({ ...patientInfo, notes: e.target.value })
              }
              placeholder="Enter any additional notes or comments"
              rows={4}
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "0.25rem",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                fontSize: "1rem",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleSkip}
              className="primary-button"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              Skip
            </button>
            <button type="submit" className="primary-button">
              Generate Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

