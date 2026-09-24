# Colorectal Histopathology AI

A local Streamlit application for reviewing colorectal H&E histology images with a user-supplied trained model. The application code provides image upload, input validation, inference orchestration, score visualization, and an optional explanation image. **It does not contain or train a model.**

> **Research use only.** This demo is not a medical device and is not intended for diagnosis, treatment, screening, or patient-care decisions. Model outputs require appropriate validation and expert review.

## What is included

- Image upload and preview for PNG, JPEG, TIFF, and BMP files
- Configurable upload-size limit
- A small, explicit adapter interface for plugging in your trained model
- Class-score visualization and optional model explanation image
- Local-first workflow: this app does not save uploaded images
- Model-weight ignore rules so large/private weights are not committed accidentally

## Run locally

Requires Python 3.10 or newer.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
streamlit run app/main.py
```

The UI will open at the local address printed by Streamlit. Until `MODEL_ADAPTER` is configured, the app will clearly report that no model is available when inference is requested.

## Connect your trained model

Implement a Python factory that returns an object with `predict(image)`. The input is a Pillow RGB image. Return an `app.inference.Prediction` containing:

- `label`: the top class name
- `scores`: a mapping of class name to a number from 0 to 1
- `explanation`: optional Pillow image, such as a heatmap overlay

For example, if your adapter is `my_model_adapter.py` and it defines `load_model()`, set this in `.env`:

```dotenv
MODEL_ADAPTER=my_model_adapter:load_model
MODEL_DIR=models
```

Then start Streamlit from the repository root. Keep your adapter module importable from the project environment. See [docs/model-integration.md](docs/model-integration.md) for a complete sketch. The adapter owns all model-specific preprocessing, loading, class mapping, and inference. No architecture, training, or weights are prescribed by this project.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MODEL_ADAPTER` | unset | Python path in `module.path:factory` form |
| `MODEL_DIR` | `models` | Suggested location for local weights; interpreted by your adapter |
| `MAX_UPLOAD_MB` | `20` | Maximum accepted image upload size |

Streamlit reads environment variables from the shell. To load `.env` automatically in development, install `python-dotenv` and use `streamlit run` through a dotenv-enabled shell, or set variables directly before launching.

## Project layout

```text
app/
  inference.py       Adapter contract and loader
  main.py            Streamlit user interface
docs/
  model-integration.md
models/              Local weights (ignored by Git)
```

## Privacy and limitations

- Uploaded images are held in the running app session and are not written to disk by this code.
- Avoid using identifiable or sensitive patient data in an unreviewed environment.
- The demo accepts ordinary image files, not whole-slide image formats such as SVS or NDPI.
- Displayed scores are model outputs and may not be calibrated probabilities.
- A heatmap is only shown if your adapter returns one; its display does not establish model validity or explainability.

## License

No license has been selected yet. Add a license only after confirming the project owners’ preference.
