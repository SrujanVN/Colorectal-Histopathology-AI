---
title: Colorectal Histopathology Analysis
emoji: 🔬
colorFrom: blue
colorTo: indigo
sdk: gradio
python_version: 3.12
app_file: app.py
short_description: Research app for colorectal tissue classification and explainability
---

# Colorectal Histopathology Analysis

An educational research application for exploring colorectal tissue image classification and model explanations. It combines a React/Vite interface with a FastAPI and PyTorch inference API, four image classifiers, and Grad-CAM, LIME, and GradientSHAP visualizations.

> **Research use only.** This application is not a medical device and does not provide a diagnosis. Its outputs must not be used as the sole basis for clinical decisions. A qualified pathologist or clinician should interpret patient-specific findings.

## Highlights

- Analyze PNG, JPEG, and TIFF histology patches with an ensemble or an individual model.
- Review the predicted tissue class, confidence, class probability distribution, and per-model scores.
- Compare four classifiers and inspect notebook-derived evaluation charts.
- View Grad-CAM, LIME, and SHAP explanations alongside the input image.
- Browse saved analyses and export PDF reports with the source image, prediction results, and all three explanation images.
- Explore an interactive 3D colorectal anatomy model.
- Ask the Gemini research assistant questions about model outputs and explanation methods.

## Models and classes

The ensemble combines ResNet50, MobileNetV2, EfficientNet-B3, and DenseNet121. It predicts one of the eight Kather tissue classes or `UNKNOWN`:

`01_TUMOR`, `02_STROMA`, `03_COMPLEX`, `04_LYMPHO`, `05_DEBRIS`, `06_MUCOSA`, `07_ADIPOSE`, `08_EMPTY`, `UNKNOWN`.

The model page reports experiment metrics recorded in the project notebooks. They describe this project's test split and are not clinical performance guarantees.

| Model | Test accuracy | Mean AUC | Cohen's kappa |
| --- | ---: | ---: | ---: |
| ResNet50 | 96.25% | 0.9982 | 0.9577 |
| MobileNetV2 | 96.25% | 0.9985 | 0.9577 |
| EfficientNet-B3 | 95.76% | 0.9970 | 0.9523 |
| DenseNet121 | 95.64% | 0.9980 | 0.9509 |

## Run with Docker

Docker Compose builds a production image with the frontend and API served from one origin. The image includes the four checkpoints used by the inference code; unused duplicate checkpoints and notebook files are excluded from the build context.

1. Install and start Docker Desktop.
2. (Optional) Configure Gemini by copying `backend/.env.example` to `backend/.env` and setting `GOOGLE_API_KEY`. Keep this file private; it is git-ignored.
3. From the repository root, run:

   ```bash
   docker compose up --build
   ```

4. Open [http://localhost:8000](http://localhost:8000). The API health check is at [http://localhost:8000/health](http://localhost:8000/health).

Stop the app with `Ctrl+C`, or run `docker compose down` in another terminal. To use a different host port, set `APP_PORT` (for example, `APP_PORT=8080 docker compose up --build`).

The application works without Gemini, but chat replies require a valid `GOOGLE_API_KEY`.

## Free deployment: Vercel frontend + Hugging Face backend

The frontend remains the existing Vite application and can be served as a static Vercel Hobby deployment. The FastAPI analysis API runs in a Hugging Face Gradio ZeroGPU Space, with a small Gradio landing page and the existing `/api/*` routes. The Vercel build uses `VITE_API_BASE_URL` to send API requests to the Space.

1. Create a **Gradio Space** on Hugging Face and select **ZeroGPU Free** hardware. Docker Spaces require a paid personal plan.
2. Push this repository to the Space repository. The root `app.py` mounts the existing FastAPI routes in the Gradio Space; dependencies are listed in the root `requirements.txt`.
3. Add `GOOGLE_API_KEY` as a Space secret in **Settings → Variables and secrets** if Gemini chat should be enabled. Keep API keys out of Git.
4. Import this GitHub repository into Vercel, set the project root to `frontend`, and add `VITE_API_BASE_URL` with the Space's public `https://<owner>-<space>.hf.space` URL. Deploy the Vercel project.

ZeroGPU is shared and has a daily quota, so it may queue or throttle inference after the free quota is used. LIME/SHAP are compute-intensive and may take longer on free capacity. See [Hugging Face ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu), [Spaces overview](https://huggingface.co/docs/hub/spaces-overview), and [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Local development without Docker

### Backend

Python 3.11 or newer is recommended.

```bash
python -m venv .venv
```

Activate the environment, then install dependencies and start FastAPI:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux, activate with `source .venv/bin/activate` and use `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` from `backend/`.

### Frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` calls to the backend on port 8000.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Health check |
| `POST /api/preview` | Create a browser-friendly preview for an uploaded image |
| `POST /api/explain` | Return a prediction and requested explanation images |
| `POST /api/chat` | Stream a Gemini assistant response |

Interactive API documentation is available at `/docs` while the backend is running.

## Project layout

```text
backend/                 FastAPI routes, model definitions, and XAI code
frontend/                React/Vite application and static assets
models(ResNet50)/         ResNet50 checkpoint
models(mobilenetv2)/      MobileNetV2 checkpoint
models(EfficientNetB3)/   EfficientNet-B3 checkpoint
models(DenseNet121)/      DenseNet121 checkpoint
Dockerfile                Local production container
docker-compose.yml        Local Docker orchestration
```

Browser history is stored locally in the user's browser. Do not upload real patient data or enter identifying health information unless your deployment has the required privacy and security controls.

## Notes

- LIME and SHAP can be compute-intensive, particularly when all methods are requested or uploads are large.
- The Docker image uses CPU-only PyTorch; GPU acceleration requires a different runtime and compatible host.
- Review dataset terms, model provenance, and dependency licenses before redistribution or clinical research use.
