from typing import Dict, Tuple, Optional

from PIL import Image

from .loader import CLASS_NAMES, predict_single_model, predict_ensemble


def run_prediction(
    image: Image.Image, model_name: Optional[str] = None
) -> Tuple[str, float, Dict[str, float], Dict[str, Dict[str, float]]]:
    """
    Wrapper used by API and XAI modules.

    Returns:
        predicted_class, confidence, ensemble_probs, per_model_probs
    """
    if model_name is not None and model_name.lower() != "ensemble":
        pred_class, conf, probs = predict_single_model(model_name, image)
        return pred_class, conf, probs, {model_name: probs}

    pred_class, conf, probs, per_model = predict_ensemble(image)
    return pred_class, conf, probs, per_model


