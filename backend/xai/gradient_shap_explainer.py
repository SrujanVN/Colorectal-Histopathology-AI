from typing import Optional

import numpy as np
import torch
from PIL import Image
from captum.attr import GradientShap

from models.loader import load_models, get_transform, TRANSFORM_SIZES, CLASS_NAMES


def generate_gradient_shap(
    image: Image.Image, model_name: Optional[str] = None
) -> np.ndarray:
    """
    Returns an HxW heatmap (float32, 0-1) representing GradientShap attributions
    for the top-predicted class of the chosen model.
    """
    models = load_models()
    if model_name is None or model_name.lower() == "ensemble":
        model_name = next(iter(models.keys()))
    if model_name not in models:
        raise ValueError(f"Model '{model_name}' not loaded for GradientShap.")

    model = models[model_name]
    model.eval()
    device = next(model.parameters()).device

    size = TRANSFORM_SIZES[model_name]
    transform = get_transform(size)
    input_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(input_tensor)
        pred_idx = int(torch.argmax(logits, dim=1).item())

    gs = GradientShap(model)
    rand_img_dist = torch.cat([input_tensor * 0, input_tensor * 1])
    attributions = gs.attribute(input_tensor, rand_img_dist, target=pred_idx)

    attr_np = attributions.squeeze().detach().cpu().numpy()
    if attr_np.ndim == 3:
        # CxHxW -> HxW by summing over channels
        attr_np = np.sum(attr_np, axis=0)

    # normalize to 0-1
    attr_np -= attr_np.min()
    if attr_np.max() > 0:
        attr_np /= attr_np.max()
    return attr_np.astype(np.float32)


