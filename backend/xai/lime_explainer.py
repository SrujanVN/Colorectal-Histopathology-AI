from typing import Optional, List, Callable

import numpy as np
import torch
from PIL import Image
from lime import lime_image
from skimage.segmentation import mark_boundaries

from models.loader import load_models, get_transform, TRANSFORM_SIZES


def _make_classifier_fn(
    model: torch.nn.Module, transform: Callable[[Image.Image], torch.Tensor], size: int
):
    device = next(model.parameters()).device

    def classifier_fn(images: List[np.ndarray]) -> np.ndarray:
        batch = torch.zeros((len(images), 3, size, size), device=device)
        for i, img in enumerate(images):
            pil_img = Image.fromarray(img.astype(np.uint8)).convert("RGB")
            batch[i] = transform(pil_img)
        with torch.no_grad():
            logits = model(batch)
            probs = torch.softmax(logits, dim=1).cpu().numpy()
        return probs

    return classifier_fn


def generate_lime_overlay(
    image: Image.Image, model_name: Optional[str] = None, num_samples: int = 300
) -> np.ndarray:
    """
    Returns an RGB uint8 image with LIME superpixel boundaries overlaid.
    """
    models = load_models()
    if model_name is None or model_name.lower() == "ensemble":
        model_name = next(iter(models.keys()))
    if model_name not in models:
        raise ValueError(f"Model '{model_name}' not loaded for LIME.")

    model = models[model_name]
    size = TRANSFORM_SIZES[model_name]
    transform = get_transform(size)

    rgb_uint = np.array(image).astype(np.uint8)
    explainer = lime_image.LimeImageExplainer()
    classifier_fn = _make_classifier_fn(model, transform, size)

    explanation = explainer.explain_instance(
        rgb_uint,
        classifier_fn,
        top_labels=1,
        hide_color=0,
        num_samples=num_samples,
    )

    top_label = explanation.top_labels[0]
    temp, mask = explanation.get_image_and_mask(
        top_label,
        positive_only=False,
        num_features=10,
        hide_rest=False,
    )
    lime_img = mark_boundaries(temp / 255.0, mask)
    lime_img = (lime_img * 255).astype(np.uint8)
    return lime_img


