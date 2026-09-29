from pathlib import Path
from typing import Dict, List, Tuple
import os

import torch
from PIL import Image
from torchvision import transforms

from .classifiers import (
    ResNet50Classifier,
    MobileNetClassifier,
    EfficientNetB3Classifier,
    DenseNetClassifier,
)


CLASS_NAMES: List[str] = [
    "01_TUMOR",
    "02_STROMA",
    "03_COMPLEX",
    "04_LYMPHO",
    "05_DEBRIS",
    "06_MUCOSA",
    "07_ADIPOSE",
    "08_EMPTY",
    "UNKNOWN",
]


BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATHS = {
    "ResNet50": BASE_DIR / "models(ResNet50)" / "best_colorectal_model.pth",
    "MobileNetV2": BASE_DIR / "models(mobilenetv2)" / "best_colorectal_mobilenetv2.pth",
    "EfficientNetB3": BASE_DIR / "models(EfficientNetB3)" / "best_colorectal_efficientnet_b3.pth",
    "DenseNet121": BASE_DIR / "models(DenseNet121)" / "best_colorectal_model.pth",
}


TRANSFORM_SIZES = {
    "ResNet50": 224,
    "MobileNetV2": 224,
    "EfficientNetB3": 224,  # can be 300 if you want to match training exactly
    "DenseNet121": 224,
}


_force_cpu = os.getenv("COLORECTAL_FORCE_CPU", "0").lower() in {"1", "true", "yes"}
_device = torch.device("cuda" if torch.cuda.is_available() and not _force_cpu else "cpu")
_models: Dict[str, torch.nn.Module] = {}


def get_transform(size: int = 224) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((size, size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def _build_model(name: str) -> torch.nn.Module:
    if name == "ResNet50":
        return ResNet50Classifier(num_classes=len(CLASS_NAMES))
    if name == "MobileNetV2":
        return MobileNetClassifier(num_classes=len(CLASS_NAMES))
    if name == "EfficientNetB3":
        return EfficientNetB3Classifier(num_classes=len(CLASS_NAMES))
    if name == "DenseNet121":
        return DenseNetClassifier(num_classes=len(CLASS_NAMES))
    raise ValueError(f"Unknown model name: {name}")


def load_models() -> Dict[str, torch.nn.Module]:
    global _models
    if _models:
        return _models

    for name, path in MODEL_PATHS.items():
        if not path.exists():
            print(f"Warning: checkpoint not found for {name}: {path}")
            continue
        model = _build_model(name)
        state = torch.load(path, map_location=_device)
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        model.load_state_dict(state, strict=False)
        model.to(_device).eval()
        _models[name] = model
    if not _models:
        raise RuntimeError("No models loaded. Check MODEL_PATHS.")
    return _models


def _softmax_logits(logits: torch.Tensor) -> torch.Tensor:
    return torch.nn.functional.softmax(logits, dim=1)


def predict_single_model(
    model_name: str, image: Image.Image
) -> Tuple[str, float, Dict[str, float]]:
    models = load_models()
    if model_name not in models:
        raise ValueError(f"Model '{model_name}' is not loaded.")

    model = models[model_name]
    size = TRANSFORM_SIZES[model_name]
    transform = get_transform(size)
    tensor = transform(image).unsqueeze(0).to(_device)

    with torch.no_grad():
        logits = model(tensor)
        probs = _softmax_logits(logits)[0].cpu().numpy()

    prob_dict = {cls: float(probs[i]) for i, cls in enumerate(CLASS_NAMES)}
    best_idx = int(probs.argmax())
    return CLASS_NAMES[best_idx], float(probs[best_idx]), prob_dict


def predict_ensemble(
    image: Image.Image,
) -> Tuple[str, float, Dict[str, float], Dict[str, Dict[str, float]]]:
    models = load_models()
    if not models:
        raise RuntimeError("No models loaded. Check MODEL_PATHS.")

    per_model_probs: Dict[str, Dict[str, float]] = {}
    accum = torch.zeros(len(CLASS_NAMES), dtype=torch.float32)

    with torch.no_grad():
        for name, model in models.items():
            size = TRANSFORM_SIZES[name]
            transform = get_transform(size)
            tensor = transform(image).unsqueeze(0).to(_device)
            logits = model(tensor)
            probs = _softmax_logits(logits)[0].cpu()
            per_model_probs[name] = {
                cls: float(probs[i]) for i, cls in enumerate(CLASS_NAMES)
            }
            accum += probs

    ensemble_probs = (accum / len(models)).numpy()
    prob_dict = {cls: float(ensemble_probs[i]) for i, cls in enumerate(CLASS_NAMES)}
    best_idx = int(ensemble_probs.argmax())
    return CLASS_NAMES[best_idx], float(ensemble_probs[best_idx]), prob_dict, per_model_probs


