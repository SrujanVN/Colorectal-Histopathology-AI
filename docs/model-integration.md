# Model adapter integration

The UI calls a small interface so the trained model can be added without restructuring the application. Model-specific code stays in your adapter.

## Adapter example

Create `my_model_adapter.py` in the repository root (or install your adapter package in the environment):

```python
from pathlib import Path

from PIL import Image

from app.inference import Prediction


class MyAdapter:
    def __init__(self, weights_dir: Path):
        # Load your own model and preprocessing configuration here.
        # Keep architecture and checkpoint choices with your training work.
        self.model = ...

    def predict(self, image: Image.Image) -> Prediction:
        # Apply the exact preprocessing expected by your trained model.
        # Convert model outputs to named scores in the range [0, 1].
        scores = ...
        label = max(scores, key=scores.get)
        return Prediction(label=label, scores=scores)


def load_model() -> MyAdapter:
    return MyAdapter(Path("models"))
```

Set `MODEL_ADAPTER=my_model_adapter:load_model` before launching the app. The `...` lines are intentional: this project does not choose or implement your model.

## Contract details

```python
Prediction(
    label="your top class",
    scores={"class A": 0.8, "class B": 0.2},
    explanation=None,  # or a PIL.Image.Image, for example a heatmap overlay
)
```

- Input is a Pillow image converted to RGB.
- `scores` must be non-empty, with values between 0 and 1.
- `label` should match a key in `scores`.
- `explanation` is optional and should be a Pillow image at a useful display size.
- The adapter is cached for the duration of the Streamlit process. Restart the app after changing model code or weights.
- If the model uses tiles or multiple crops, tile aggregation belongs inside `predict`.

Keep checkpoints out of version control. The `models/` path is ignored by Git by default.
