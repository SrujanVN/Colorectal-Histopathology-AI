import { jsPDF } from "jspdf";
import type { ExplainResult, ExplanationType } from "../api/client";

export interface PatientInfo {
  name: string;
  patientId: string;
  date: string;
  physician: string;
  notes: string;
}

interface ReportData {
  patientInfo: PatientInfo;
  fileName: string;
  modelName: string;
  timestamp: number;
  result: ExplainResult;
  imageBase64: string;
  imageMimeType: string;
}

/**
 * Generate a professional medical report PDF
 */
export async function generateMedicalReport(
  patientInfo: PatientInfo,
  fileName: string,
  modelName: string,
  timestamp: number,
  result: ExplainResult,
  imageBase64: string,
  imageMimeType: string
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont(undefined, "bold");
    } else {
      doc.setFont(undefined, "normal");
    }
    
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize * 0.5);
      doc.text(line, margin, yPos);
      yPos += fontSize * 0.5;
    });
    yPos += 5;
  };

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "bold");
  doc.text("Colorectal Cancer Histology", margin, yPos);
  yPos += 10;
  doc.setFontSize(16);
  doc.text("Analysis Report", margin, yPos);
  yPos += 15;

  // Patient Information Section
  addText("PATIENT INFORMATION", 14, true);
  addText(`Patient Name: ${patientInfo.name || "N/A"}`, 11);
  addText(`Patient ID: ${patientInfo.patientId || "N/A"}`, 11);
  addText(`Date: ${patientInfo.date || new Date(timestamp).toLocaleDateString()}`, 11);
  addText(`Physician: ${patientInfo.physician || "N/A"}`, 11);
  if (patientInfo.notes) {
    addText(`Notes: ${patientInfo.notes}`, 11);
  }
  yPos += 10;

  // Analysis Details Section
  addText("ANALYSIS DETAILS", 14, true);
  addText(`Image File: ${fileName}`, 11);
  addText(`Model Used: ${modelName === "ensemble" ? "Ensemble (4 models)" : modelName}`, 11);
  addText(`Analysis Timestamp: ${new Date(timestamp).toLocaleString()}`, 11);
  yPos += 10;

  // Diagnosis Section
  addText("DIAGNOSIS", 14, true);
  const predictedClass = result.prediction.predicted_class;
  const confidence = result.prediction.confidence;
  addText(`Predicted Class: ${predictedClass}`, 12, true, [0, 0, 0]);
  addText(`Confidence Level: ${(confidence * 100).toFixed(1)}%`, 12, false, [0, 100, 0]);
  yPos += 10;

  // Class Probabilities Section
  addText("CLASS PROBABILITIES", 14, true);
  const classEntries = Object.entries(result.prediction.class_probabilities)
    .sort((a, b) => b[1] - a[1]);
  
  // Create table
  const tableStartY = yPos;
  const colWidths = [contentWidth * 0.6, contentWidth * 0.4];
  const rowHeight = 8;
  
  // Table header
  checkPageBreak(rowHeight + 5);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.rect(margin, yPos, colWidths[0], rowHeight);
  doc.text("Class", margin + 2, yPos + 5);
  doc.rect(margin + colWidths[0], yPos, colWidths[1], rowHeight);
  doc.text("Probability", margin + colWidths[0] + 2, yPos + 5);
  yPos += rowHeight;

  // Table rows
  classEntries.forEach(([label, prob]) => {
    checkPageBreak(rowHeight + 5);
    const isPredicted = label === predictedClass;
    doc.setFont(undefined, isPredicted ? "bold" : "normal");
    doc.setTextColor(isPredicted ? 0 : 100, isPredicted ? 100 : 100, isPredicted ? 0 : 100);
    
    doc.rect(margin, yPos, colWidths[0], rowHeight);
    doc.text(label, margin + 2, yPos + 5);
    doc.rect(margin + colWidths[0], yPos, colWidths[1], rowHeight);
    doc.text(`${(prob * 100).toFixed(1)}%`, margin + colWidths[0] + 2, yPos + 5);
    yPos += rowHeight;
  });
  
  doc.setTextColor(0, 0, 0);
  yPos += 10;

  // Per-Model Analysis Section
  if (result.prediction.per_model_scores.length > 1) {
    addText("PER-MODEL ANALYSIS", 14, true);
    
    const modelColWidths = [
      contentWidth * 0.3,
      ...result.prediction.per_model_scores.map(() => contentWidth * 0.7 / result.prediction.per_model_scores.length)
    ];
    
    checkPageBreak(rowHeight * 2);
    // Model header
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    let xPos = margin;
    doc.rect(xPos, yPos, modelColWidths[0], rowHeight);
    doc.text("Class", xPos + 2, yPos + 5);
    xPos += modelColWidths[0];
    
    result.prediction.per_model_scores.forEach((model, idx) => {
      doc.rect(xPos, yPos, modelColWidths[idx + 1], rowHeight);
      const modelText = model.model_name.length > 12 
        ? model.model_name.substring(0, 10) + ".."
        : model.model_name;
      doc.text(modelText, xPos + 1, yPos + 5);
      xPos += modelColWidths[idx + 1];
    });
    yPos += rowHeight;

    // Model rows (show top 5 classes)
    const topClasses = classEntries.slice(0, 5);
    topClasses.forEach(([label]) => {
      checkPageBreak(rowHeight + 5);
      doc.setFont(undefined, label === predictedClass ? "bold" : "normal");
      xPos = margin;
      doc.rect(xPos, yPos, modelColWidths[0], rowHeight);
      doc.text(label.length > 15 ? label.substring(0, 13) + ".." : label, xPos + 1, yPos + 5);
      xPos += modelColWidths[0];
      
      result.prediction.per_model_scores.forEach((model, idx) => {
        const prob = model.probabilities[label] ?? 0;
        doc.rect(xPos, yPos, modelColWidths[idx + 1], rowHeight);
        doc.text(`${(prob * 100).toFixed(1)}%`, xPos + 1, yPos + 5);
        xPos += modelColWidths[idx + 1];
      });
      yPos += rowHeight;
    });
    
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  }

  // XAI Explanations Section
  addText("EXPLAINABLE AI ANALYSIS", 14, true);
  
  if (result.gradcam) {
    addText("Grad-CAM (Gradient-weighted Class Activation Mapping):", 11, true);
    addText("This method highlights the regions of the histology image that most influenced the model's classification decision. Warmer colors indicate higher importance in the prediction.", 10);
    yPos += 5;
  }
  
  if (result.lime) {
    addText("LIME (Local Interpretable Model-agnostic Explanations):", 11, true);
    addText("LIME provides interpretable explanations by approximating the model's decision boundary locally around the specific image sample using interpretable linear models.", 10);
    yPos += 5;
  }
  
  if (result.shap) {
    addText("SHAP (SHapley Additive exPlanations):", 11, true);
    addText("SHAP uses game-theory based feature attribution to explain how each pixel contributes to the final classification prediction, providing a comprehensive view of feature importance.", 10);
    yPos += 5;
  }
  
  yPos += 10;

  // Image Section
  try {
    checkPageBreak(60);
    addText("ANALYZED IMAGE", 14, true);
    
    // Convert base64 to image and add to PDF
    const img = new Image();
    const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Image load timeout"));
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const imgWidth = 80;
          const imgHeight = (img.height / img.width) * imgWidth;
          checkPageBreak(imgHeight + 10);
          // Determine image format for jsPDF
          let format: string = "JPEG";
          if (imageMimeType.includes("png")) format = "PNG";
          else if (imageMimeType.includes("jpeg") || imageMimeType.includes("jpg")) format = "JPEG";
          
          doc.addImage(imageDataUrl, format, margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to load image"));
      };
      img.src = imageDataUrl;
    });
  } catch (error) {
    console.warn("Failed to add image to PDF:", error);
    addText("(Image could not be embedded)", 10);
  }

  yPos += 10;

  // Disclaimer Section
  addText("DISCLAIMER", 14, true);
  addText("This report is generated by an automated analysis system using ensemble deep learning models. The results are for research and educational purposes only and should not be used as the sole basis for clinical diagnosis. Always consult with qualified medical professionals for clinical decision-making.", 9);
  yPos += 5;
  addText("Classes follow the Kather colorectal histology scheme (8 tissue types + UNKNOWN).", 9);
  yPos += 5;
  addText(`Report generated on ${new Date().toLocaleString()}`, 9);

  // Generate filename
  const reportDate = new Date().toISOString().split("T")[0];
  const patientIdPart = patientInfo.patientId 
    ? `_${patientInfo.patientId.replace(/[^a-zA-Z0-9]/g, "_")}` 
    : "";
  const filename = `Colorectal_Report${patientIdPart}_${reportDate}.pdf`;

  // Save PDF
  doc.save(filename);
}

/**
 * Format patient information for display
 */
export function formatPatientInfo(patientInfo: PatientInfo): string {
  const parts: string[] = [];
  if (patientInfo.name) parts.push(`Name: ${patientInfo.name}`);
  if (patientInfo.patientId) parts.push(`ID: ${patientInfo.patientId}`);
  if (patientInfo.date) parts.push(`Date: ${patientInfo.date}`);
  if (patientInfo.physician) parts.push(`Physician: ${patientInfo.physician}`);
  return parts.join(" | ");
}

