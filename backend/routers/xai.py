import base64
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, File, UploadFile, Query, Response
from PIL import Image, ImageOps

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


def _encode_heatmap_to_base64(heatmap, source_image: Image.Image) -> str:
    """Render attribution magnitude as a readable, image-aligned color overlay."""
    import cv2
    import numpy as np

    source = np.asarray(source_image.convert("RGB"), dtype=np.uint8)
    values = np.asarray(heatmap, dtype=np.float32)
    values = cv2.resize(values, (source.shape[1], source.shape[0]), interpolation=cv2.INTER_LINEAR)
    values = np.nan_to_num(values, nan=0.0, posinf=1.0, neginf=0.0)
    values = np.clip(values, 0.0, 1.0)
    color = cv2.applyColorMap((values * 255).astype(np.uint8), cv2.COLORMAP_TURBO)
    color = cv2.cvtColor(color, cv2.COLOR_BGR2RGB)
    overlay = cv2.addWeighted(source, 0.44, color, 0.56, 0)
    img = Image.fromarray(overlay, mode="RGB")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@router.post("/preview")
async def preview_image(file: UploadFile = File(...)) -> Response:
    """Return a browser-friendly thumbnail for supported Pillow image formats."""
    raw = await file.read()
    with Image.open(BytesIO(raw)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        buf = BytesIO()
        image.save(buf, format="JPEG", quality=92, optimize=True)
    return Response(content=buf.getvalue(), media_type="image/jpeg", headers={"Cache-Control": "no-store"})


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
        shap = ShapMap(heatmap_base64=_encode_heatmap_to_base64(shap_map, image))

    return ExplainResult(
        prediction=prediction,
        gradcam=gradcam,
        lime=lime,
        shap=shap,
    )


