from typing import List, Optional, Literal, Dict

from pydantic import BaseModel


class ModelScore(BaseModel):
    model_name: str
    probabilities: Dict[str, float]


class PredictionResult(BaseModel):
    predicted_class: str
    confidence: float
    class_probabilities: Dict[str, float]
    per_model_scores: List[ModelScore]


ExplanationType = Literal["gradcam", "lime", "shap"]


class ExplainRequest(BaseModel):
    explanation_types: List[ExplanationType] = ["gradcam", "lime", "shap"]
    model_name: Optional[str] = None  # None => use ensemble


class GradCamMap(BaseModel):
    heatmap_base64: str


class LimeMap(BaseModel):
    overlay_base64: str


class ShapMap(BaseModel):
    heatmap_base64: str


class ExplainResult(BaseModel):
    prediction: PredictionResult
    gradcam: Optional[GradCamMap] = None
    lime: Optional[LimeMap] = None
    shap: Optional[ShapMap] = None




