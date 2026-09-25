# Colorectal Histopathology Analysis

An explainable AI research application for classifying colorectal histopathology image patches with an ensemble of deep-learning models. The project combines a React/Vite dashboard with a FastAPI/PyTorch inference service and produces visual explanations using Grad-CAM, LIME, and GradientSHAP.

> **Research use only:** This project is not a clinical diagnostic device. Predictions must not be used as the sole basis for medical decisions and should be reviewed by a qualified pathologist or physician.

## Features

- Upload colorectal histology patches in PNG, JPG, or TIFF format.
- Run an ensemble prediction or select an individual model.
- View predicted class, confidence, class probabilities, and per-model scores.
- Generate image-specific Grad-CAM, LIME, and SHAP/GradientSHAP explanations.
- Review model transparency information, notebook-derived metrics, and training graphs.
- Explore a local 3D intestinal anatomy model.
- Save successful analyses in browser history using `localStorage`.
- Generate branded PDF reports with patient details, predictions, probabilities, analyzed images, explanation maps, and research disclaimers.
- Use dedicated Home, Analysis Workspace, Models, Reports, and History routes.

## System architecture

```text
React + Vite frontend (5173)
          |
          | /api proxy
          v
FastAPI + PyTorch backend (8000)
          |
          +-- ResNet50
          +-- MobileNetV2
          +-- EfficientNet-B3
          +-- DenseNet121
          +-- Grad-CAM / LIME / GradientSHAP
```

## Models and dataset

The application supports nine output classes:

`01_TUMOR`, `02_STROMA`, `03_COMPLEX`, `04_LYMPHO`, `05_DEBRIS`, `06_MUCOSA`, `07_ADIPOSE`, `08_EMPTY`, and `UNKNOWN`.

The dashboard presents metrics extracted from the executed project notebooks. These values are research results, not clinical performance guarantees.

| Model | Test accuracy | Mean AUC | Cohen's kappa |
| --- | ---: | ---: | ---: |
| ResNet50 | 96.25% | 0.9982 | 0.9577 |
| MobileNetV2 | 96.25% | 0.9985 | 0.9577 |
| EfficientNet-B3 | 95.76% | 0.9970 | 0.9523 |
| DenseNet121 | 95.64% | 0.9980 | 0.9509 |

The documented dataset contains 5,500 samples with a 70/15/15 train/validation/test split and 826 test images.

## Requirements

- Python 3.11+
- Node.js 18+ (Node.js 20 recommended)
- npm
- Model checkpoint files in the repository's model directories
- Windows, macOS, or Linux

## Local setup

### 1. Install backend dependencies

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

On macOS/Linux, activate the environment with:

```bash
source .venv/bin/activate
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Start the backend

From the repository root:

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend health endpoint is:

```text
http://localhost:8000/health
```

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173/
```

The Vite development server proxies `/api` requests to `http://localhost:8000`.

## Docker

The repository includes a backend `Dockerfile` and a `docker-compose.yml` for local orchestration:

```bash
docker compose up --build
```

The backend is exposed on port `8000`. The frontend development server is exposed on port `5173`.

For production hosting, deploy the frontend and backend separately. A static frontend host such as Netlify or Vercel can serve the Vite build, while the Python/PyTorch backend needs a service capable of storing the model checkpoints and running CPU/GPU inference.

## API

### Health check

```http
GET /health
```

### Prediction and explanations

```http
POST /api/explain
Content-Type: multipart/form-data
```

Form fields:

- `file`: image file
- `model_name`: `ensemble`, `ResNet50`, `MobileNetV2`, `EfficientNetB3`, or `DenseNet121`
- `explanation_types`: one or more of `gradcam`, `lime`, and `shap`

Example with `curl`:

```bash
curl -X POST http://localhost:8000/api/explain \
  -F "file=@sample.png" \
  -F "model_name=ensemble" \
  -F "explanation_types=gradcam" \
  -F "explanation_types=lime" \
  -F "explanation_types=shap"
```

The response includes the prediction, class probabilities, per-model scores, and requested base64-encoded explanation images.

## Frontend commands

Run these commands from `frontend/`:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
```

## Environment variables

The core prediction and reporting workflow does not require an environment variable. `GOOGLE_API_KEY` is optional and is only needed for any Gemini/Google chatbot integration that is enabled in a deployment.

Never commit API keys, model credentials, or private patient data. Use environment variables supplied by the hosting provider.

## Project structure

```text
backend/
  main.py                 FastAPI application
  models/                 Model loaders and ensemble prediction
  routers/                Prediction and explanation endpoints
  xai/                    Grad-CAM, LIME, and GradientSHAP implementations
  requirements.txt        Python dependencies

frontend/
  src/
    pages/                Home, Models, Reports, and History routes
    components/           Reusable dashboard and analysis components
    services/             History and PDF report services
    api/                  Backend API client
  public/
    models/               Local 3D anatomy asset
    notebook-graphs/      Notebook-derived model graph images

models(...)/              Trained model checkpoints
notenooks/                Source notebooks and experiment outputs
Dockerfile                Backend container definition
docker-compose.yml        Local service orchestration
```

## Performance notes

LIME and SHAP can be computationally expensive on CPU, especially for full-size images or multiple explanation methods. For a smoother public deployment:

- Use a host with sufficient memory and CPU/GPU capacity.
- Keep model checkpoints outside standard Git history when they exceed repository limits; Git LFS or model storage is recommended.
- Add request timeouts appropriate for explanation generation.
- Consider asynchronous job processing for multiple concurrent users.

## License and attribution

Review the repository's intended license and dataset terms before public distribution. Model checkpoints, notebook outputs, and third-party libraries may have separate licenses or usage requirements.
