from typing import Dict, List, Optional

import cv2
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from scipy.ndimage import zoom

from models.loader import load_models, get_transform, TRANSFORM_SIZES


_TARGET_LAYERS: Dict[str, List[torch.nn.Module]] = {}


def _get_target_layers() -> Dict[str, List[torch.nn.Module]]:
    global _TARGET_LAYERS
    if _TARGET_LAYERS:
        return _TARGET_LAYERS

    models = load_models()
    _TARGET_LAYERS = {
        "EfficientNetB3": [models["EfficientNetB3"].backbone.features[-1]],
        "DenseNet121": [models["DenseNet121"].backbone.features.denseblock4],
        "MobileNetV2": [models["MobileNetV2"].backbone.features[-1]],
        "ResNet50": [models["ResNet50"].backbone.layer4[-1]],
    }
    return _TARGET_LAYERS


def generate_gradcam(image: Image.Image, model_name: Optional[str] = None) -> np.ndarray:
    models = load_models()
    if not models:
        raise RuntimeError("No models loaded for Grad-CAM.")

    if model_name is None or model_name.lower() == "ensemble":
        # use first model as representative for Grad-CAM
        model_name = next(iter(models.keys()))

    if model_name not in models:
        raise ValueError(f"Model '{model_name}' not loaded for Grad-CAM")

    model = models[model_name]
    size = TRANSFORM_SIZES[model_name]
    transform = get_transform(size)
    device = next(model.parameters()).device

    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        pred_idx = int(torch.argmax(logits, dim=1).item())

    rgb = np.array(image).astype(np.float32) / 255.0

    target_layers = _get_target_layers()[model_name]
    cam = GradCAM(model=model, target_layers=target_layers)
    grayscale_cam = cam(tensor, [ClassifierOutputTarget(pred_idx)])[0, :]

    if grayscale_cam.shape != rgb.shape[:2]:
        sy = rgb.shape[0] / grayscale_cam.shape[0]
        sx = rgb.shape[1] / grayscale_cam.shape[1]
        grayscale_cam = zoom(grayscale_cam, (sy, sx), order=1)

    overlay = show_cam_on_image(rgb, grayscale_cam, use_rgb=True)
    overlay = (overlay * 255).astype(np.uint8)
    return overlay