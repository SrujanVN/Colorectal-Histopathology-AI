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

## Deploy to Vercel

The repository includes a root-level `Dockerfile.vercel`. Vercel detects this file and deploys the combined frontend/API container. The account must allow container-based Functions and have enough bundle capacity for PyTorch and the model checkpoints.

1. Push this repository to GitHub and import it in Vercel, keeping the repository root as the project root.
2. Add `GOOGLE_API_KEY` as an encrypted Vercel environment variable for Production and Preview if the Gemini assistant should be enabled. Optionally set `GEMINI_MODEL`.
3. Deploy. Vercel builds and runs the container using its assigned `$PORT`.

Vercel Functions have platform limits for container size, memory, execution time, and request payloads. The built image is larger than the standard Function bundle limit; for an existing Vercel project, enable large Functions with `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` if Vercel requests it. Histology uploads must fit the platform's request-body limit, and LIME/SHAP analysis may take longer than a typical web request. If your Vercel plan or project settings cannot accommodate the image or inference workload, host the Docker image on a container service with suitable CPU, memory, request-size, and timeout limits, and set the frontend API base URL accordingly. See [Vercel's container deployment guide](https://vercel.com/kb/guide/docker-on-vercel-vs-render) and [Function limits](https://vercel.com/docs/functions/limitations).

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
Dockerfile.vercel         Vercel container entrypoint
docker-compose.yml        Local Docker orchestration
```

Browser history is stored locally in the user's browser. Do not upload real patient data or enter identifying health information unless your deployment has the required privacy and security controls.

## Notes

- LIME and SHAP can be compute-intensive, particularly when all methods are requested or uploads are large.
- The Docker image uses CPU-only PyTorch; GPU acceleration requires a different runtime and compatible host.
- Review dataset terms, model provenance, and dependency licenses before redistribution or clinical research use.
