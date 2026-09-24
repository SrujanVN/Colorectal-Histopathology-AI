"""Stable boundary between the demo UI and a user-supplied trained model."""

from __future__ import annotations

import importlib
import os
from dataclasses import dataclass
from typing import Protocol

from PIL import Image


@dataclass(frozen=True)
class Prediction:
    """One image-level prediction returned by a model adapter.

    ``scores`` maps class names to probabilities in [0, 1]. The UI does not
    interpret these as calibrated clinical confidence values.
    """

    label: str
    scores: dict[str, float]
    explanation: Image.Image | None = None


class ModelAdapter(Protocol):
    def predict(self, image: Image.Image) -> Prediction: ...


def load_model_adapter() -> ModelAdapter:
    """Load a user-provided adapter via ``module.path:factory``."""

    target = os.getenv("MODEL_ADAPTER", "").strip()
    if not target:
        raise RuntimeError(
            "No model is configured yet. Train your model, implement the adapter "
            "contract in README.md, then set MODEL_ADAPTER=module.path:factory."
        )
    module_name, separator, factory_name = target.partition(":")
    if not separator or not module_name or not factory_name:
        raise RuntimeError("MODEL_ADAPTER must use the form module.path:factory")
    factory = getattr(importlib.import_module(module_name), factory_name)
    adapter = factory()
    if not callable(getattr(adapter, "predict", None)):
        raise TypeError("The configured adapter must provide predict(image).")
    return adapter
