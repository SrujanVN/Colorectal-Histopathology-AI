from io import BytesIO

from fastapi import APIRouter, File, UploadFile
from PIL import Image

from models.ensemble import run_prediction
from schemas import ModelScore, PredictionResult


router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResult)
async def predict(
    file: UploadFile = File(...),
) -> PredictionResult:
    contents = await file.read()
    image = Image.open(BytesIO(contents)).convert("RGB")

    pred_class, conf, probs, per_model = run_prediction(image, model_name=None)

    per_model_scores = [
        ModelScore(model_name=name, probabilities=prob)
        for name, prob in per_model.items()
    ]

    return PredictionResult(
        predicted_class=pred_class,
        confidence=conf,
        class_probabilities=probs,
        per_model_scores=per_model_scores,
    )


