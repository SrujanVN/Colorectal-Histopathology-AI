export type ExplanationType = "gradcam" | "lime" | "shap";

export interface ModelScore {
  model_name: string;
  probabilities: Record<string, number>;
}

export interface PredictionResult {
  predicted_class: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  per_model_scores: ModelScore[];
}

export interface ExplainResult {
  prediction: PredictionResult;
  gradcam?: { heatmap_base64: string } | null;
  lime?: { overlay_base64: string } | null;
  shap?: { heatmap_base64: string } | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function uploadAndExplain(
  file: File,
  modelName: string,
  explanationTypes: ExplanationType[]
): Promise<ExplainResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("model_name", modelName);
  explanationTypes.forEach((t) => form.append("explanation_types", t));

  const res = await fetch(`${API_BASE}/api/explain`, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return (await res.json()) as ExplainResult;
}

/**
 * Simple in-browser mock chatbot implementation.
 * Does not call the backend; generates a lightweight response locally.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  prediction?: PredictionResult
): Promise<ChatResponse> {
  const last = messages[messages.length - 1];
  const userText = (last?.content ?? "").toLowerCase().trim();

  // Very small delay to show typing indicator
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Question matching and answer generation
  const answer = matchQuestionAndAnswer(userText, prediction);

  return { message: answer };
}

/**
 * Matches user questions to specific answers based on keywords and patterns.
 */
function matchQuestionAndAnswer(
  userText: string,
  prediction?: PredictionResult
): string {
  // Helper to check if text contains any of the keywords
  const contains = (...keywords: string[]) =>
    keywords.some((kw) => userText.includes(kw.toLowerCase()));

  // 1. TUMOR classification with high confidence (92%)
  if (
    contains("tumor", "classified") &&
    (contains("92", "90", "high confidence", "high confidence") ||
      userText.match(/\d{2,3}%/))
  ) {
    return `A TUMOR classification with 92% confidence indicates that the model has identified cancerous tissue in the histology patch with high certainty.

**What TUMOR tissue means:**
TUMOR tissue in colorectal histology refers to malignant (cancerous) epithelial tissue. This typically shows:
- Abnormal glandular structures (irregular, crowded glands)
- Nuclear atypia (abnormal cell nuclei)
- Loss of normal tissue architecture
- Increased mitotic activity

**High confidence (92%):**
A confidence score of 92% means the model is very certain about this classification. The tissue features strongly match the TUMOR class from the training data. However, always consult with a pathologist for clinical interpretation and diagnosis.

**Important:** This is a research tool. All results should be reviewed by qualified medical professionals before any clinical decisions are made.`;
  }

  // 2. Low confidence (55%)
  if (
    contains("confidence", "55", "low confidence", "uncertain") ||
    (userText.match(/\d{1,2}%/i) && userText.match(/mean|what|does/))
  ) {
    const confidenceMatch = userText.match(/(\d{1,2})%/);
    const confValue = confidenceMatch ? parseInt(confidenceMatch[1]) : null;

    return `A confidence score around 55% indicates **moderate uncertainty** in the classification. Here's what this means:

**Why lower confidence?**
- **Borderline tissue:** The sample may have features that overlap between multiple tissue classes
- **Mixed tissue types:** The patch might contain a combination of different tissue types
- **Ambiguous features:** The histological features may not clearly match any single class
- **Image quality:** Lower resolution or artifacts can reduce model confidence

**What to consider:**
- Review the class probabilities - other classes may have similar scores
- Check the explainability visualizations (Grad-CAM, LIME, SHAP) to see which regions the model focused on
- Consider analyzing a different region of the tissue sample
- Consult with a pathologist for expert interpretation

**Clinical note:** Lower confidence scores require careful review and should not be used alone for diagnostic decisions.`;
  }

  // 3. 8 tissue classes explanation
  if (
    contains("8 tissue", "tissue classes", "tissue types", "classes used") ||
    (contains("explain") && contains("class"))
  ) {
    return `The model classifies colorectal histology patches into **8 tissue classes** based on the Kather dataset:

1. **TUMOR** - Malignant epithelial tissue with abnormal glandular structures, nuclear atypia, and loss of normal architecture

2. **STROMA** - Connective tissue that supports epithelial structures, often seen around tumors (cancer-associated stroma)

3. **COMPLEX** - Complex tissue patterns that may include mixed or transitional tissue types

4. **LYMPHO** (Lymphocytes) - Immune cells, often present in inflammatory responses or immune reactions

5. **DEBRIS** - Cellular debris, necrotic material, or non-viable tissue fragments

6. **MUCOSA** - Normal colon mucosa with regular glandular structures and typical epithelial cells

7. **ADIPOSE** - Fat tissue, typically found in the submucosa or surrounding areas

8. **EMPTY** (Background) - Empty spaces, background areas, or regions without significant tissue

These classes help pathologists and researchers identify different tissue components in colorectal histology samples. The ensemble model combines predictions from ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121 to improve accuracy across all classes.`;
  }

  // 4. Grad-CAM explanation
  if (
    contains("grad-cam", "gradcam", "grad cam") &&
    (contains("what", "explain", "how", "read", "heatmap") ||
      contains("heatmap"))
  ) {
    return `**Grad-CAM (Gradient-weighted Class Activation Mapping)** is an explainability method that visualizes which regions of the histology image the model considers most important for its classification decision.

**How it works:**
- Grad-CAM uses the gradients flowing into the final convolutional layer
- It creates a heatmap showing where the model "looked" when making its prediction
- The technique combines feature maps with gradient information to highlight important regions

**How to read the heatmap:**
- **Red/Hot regions** (high values) = Areas the model focused on most for classification
- **Blue/Cold regions** (low values) = Areas the model considered less important
- **Yellow/Orange regions** = Moderate importance

**For colorectal histology:**
- In a TUMOR classification, red regions typically highlight abnormal glandular structures or nuclear atypia
- For STROMA, it may highlight connective tissue patterns
- The heatmap helps you understand which histological features drove the model's decision

**Use case:** Grad-CAM is particularly useful for understanding which tissue structures the deep learning model uses to distinguish between different classes.`;
  }

  // 5. LIME vs SHAP comparison
  if (
    (contains("lime", "shap") && contains("different", "difference", "compare")) ||
    (contains("how") && contains("lime", "shap"))
  ) {
    return `**LIME** and **SHAP** are both explainability methods, but they work differently:

## LIME (Local Interpretable Model-agnostic Explanations)

**Approach:**
- Creates a **local linear approximation** around a specific prediction
- Perturbs the input image (superpixels) and observes how predictions change
- Builds a simple, interpretable model that explains the prediction locally

**Strengths:**
- Easy to understand - shows which superpixels contribute to the prediction
- Model-agnostic (works with any classifier)
- Fast to compute

**Limitations:**
- Only explains locally (around one prediction)
- Can be unstable (may vary between runs)

## SHAP (SHapley Additive exPlanations)

**Approach:**
- Uses **game theory** (Shapley values) to fairly distribute contribution to the prediction
- GradientShap (used here) approximates SHAP values using gradients
- Provides a unified framework for feature attribution

**Strengths:**
- Theoretically grounded in game theory
- Provides consistent explanations
- Shows both positive and negative contributions

**Limitations:**
- Can be computationally expensive
- GradientShap is an approximation (not exact SHAP)

## When to use each:

- **LIME:** When you want a quick, intuitive explanation of which image regions matter
- **SHAP:** When you need theoretically sound, consistent feature attributions

**In this platform:** Both methods complement each other - LIME gives you a local view, while SHAP provides a more rigorous attribution analysis.`;
  }

  // 6. Histological features of colorectal cancer
  if (
    contains("histological", "histology", "features") &&
    (contains("colorectal", "cancer", "tumor") || contains("common"))
  ) {
    return `**Common histological features of colorectal cancer tissue** include:

## Key Features:

1. **Abnormal Glandular Structures:**
   - Irregular, crowded, or branching glands
   - Loss of normal crypt architecture
   - Glands may appear back-to-back without intervening stroma

2. **Nuclear Atypia:**
   - Enlarged, hyperchromatic (dark-staining) nuclei
   - Irregular nuclear shapes and sizes
   - Prominent nucleoli
   - Increased nuclear-to-cytoplasmic ratio

3. **Loss of Polarity:**
   - Cells lose their normal orientation
   - Nuclei positioned at various levels instead of basal

4. **Increased Mitotic Activity:**
   - More dividing cells than normal tissue
   - Atypical mitotic figures

5. **Invasion Patterns:**
   - Infiltration into surrounding tissues
   - Desmoplastic reaction (stromal response)
   - Angiolymphatic invasion (in advanced cases)

6. **Mucin Production:**
   - May show increased or decreased mucin
   - Signet ring cells (in some variants)

## What the model looks for:

The deep learning models are trained to recognize these patterns from the Kather dataset. They learn to distinguish TUMOR tissue from normal MUCOSA, STROMA, and other tissue types based on these histological features.

**Note:** These features are used for research and educational purposes. Clinical diagnosis requires expert pathological review.`;
  }

  // 7. Ensemble models explanation
  if (
    contains("ensemble", "resnet", "mobilenet", "efficientnet", "densenet") &&
    (contains("why", "useful", "benefit", "advantage") ||
      contains("useful here"))
  ) {
    return `Using an **ensemble of ResNet50, MobileNetV2, EfficientNetB3, and DenseNet121** provides several key advantages:

## Benefits of Ensemble Learning:

1. **Improved Accuracy:**
   - Each model may catch different features or patterns
   - Combining predictions reduces individual model errors
   - The ensemble often outperforms any single model

2. **Robustness:**
   - If one model misclassifies, others may correct it
   - Less sensitive to outliers or unusual cases
   - More reliable predictions across diverse tissue samples

3. **Reduced Overfitting:**
   - Different architectures generalize differently
   - Ensemble averaging reduces overfitting to training data
   - Better performance on unseen histology patches

4. **Architectural Diversity:**
   - **ResNet50:** Deep residual learning, good at complex features
   - **MobileNetV2:** Lightweight, efficient, captures different patterns
   - **EfficientNetB3:** Compound scaling, balanced depth/width/resolution
   - **DenseNet121:** Dense connections, maximizes feature reuse

5. **Complementary Strengths:**
   - Each architecture has different inductive biases
   - ResNet excels at deep features, MobileNet at efficiency, EfficientNet at scaling, DenseNet at feature reuse
   - Together they cover a broader range of tissue characteristics

## How it works here:

The ensemble combines predictions from all four models (typically by averaging probabilities) to produce a final classification. This approach is especially valuable in medical imaging where accuracy and reliability are critical.

**Result:** More confident and accurate tissue classification compared to using any single model alone.`;
  }

  // Fallback: Generic helpful response
  return `I'm here to help answer questions about colorectal cancer histology classification and explainable AI!

**I can help with:**
- Understanding tissue classification results and confidence scores
- Explaining the 8 tissue classes (TUMOR, STROMA, COMPLEX, LYMPHO, DEBRIS, MUCOSA, ADIPOSE, EMPTY)
- Describing explainability methods (Grad-CAM, LIME, SHAP)
- Explaining histological features of colorectal cancer tissue
- Discussing the benefits of ensemble models

**Try asking:**
- "What does a TUMOR classification mean?"
- "Can you explain the 8 tissue classes?"
- "What is Grad-CAM and how do I read the heatmap?"
- "How is LIME different from SHAP?"
- "What are common histological features of colorectal cancer?"
- "Why use an ensemble of multiple models?"

**Important:** This is a research tool. Always consult with qualified medical professionals for clinical interpretation and diagnosis.`;
}
