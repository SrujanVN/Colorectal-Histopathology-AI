import base64
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, File, UploadFile, Query
from PIL import Image

from models.ensemble import run_prediction
from schemas import ExplainResult, ExplanationType, GradCamMap, LimeMap, ShapMap
from xai.gradcam import generate_gradcam
from xai.gradient_shap_explainer import generate_gradient_shap
from xai.lime_explainer import generate_lime_overlay


router = APIRouter(tags=["xai"])


def _encode_image_to_base64(img) -> str:
    buf = BytesIO()
    Image.fromarray(img).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _encode_heatmap_to_base64(heatmap) -> str:
    # heatmap is HxW float in [0,1]; convert to grayscale PNG
    arr = (heatmap * 255).astype("uint8")
    img = Image.fromarray(arr, mode="L")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@router.post("/explain", response_model=ExplainResult)
async def explain(
    file: UploadFile = File(...),
    model_name: Optional[str] = Query(default="ensemble"),
    explanation_types: List[ExplanationType] = Query(
        default=["gradcam", "lime", "shap"]
    ),
) -> ExplainResult:
    raw = await file.read()
    image = Image.open(BytesIO(raw)).convert("RGB")

    pred_class, conf, probs, per_model = run_prediction(
        image, model_name=None if model_name == "ensemble" else model_name
    )

    from schemas import ModelScore, PredictionResult

    prediction = PredictionResult(
        predicted_class=pred_class,
        confidence=conf,
        class_probabilities=probs,
        per_model_scores=[
            ModelScore(model_name=name, probabilities=pp)
            for name, pp in per_model.items()
        ],
    )

    gradcam = lime = shap = None

    if "gradcam" in explanation_types:
        grad_img = generate_gradcam(image, model_name=model_name)
        gradcam = GradCamMap(heatmap_base64=_encode_image_to_base64(grad_img))

    if "lime" in explanation_types:
        lime_img = generate_lime_overlay(image, model_name=model_name)
        lime = LimeMap(overlay_base64=_encode_image_to_base64(lime_img))

    if "shap" in explanation_types:
        shap_map = generate_gradient_shap(image, model_name=model_name)
        shap = ShapMap(heatmap_base64=_encode_heatmap_to_base64(shap_map))

    return ExplainResult(
        prediction=prediction,
        gradcam=gradcam,
        lime=lime,
        shap=shap,
    )


