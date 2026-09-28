from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import HTTPException

from routers import chat, predict, xai  # type: ignore[attr-defined]


app = FastAPI(
    title="Colorectal Cancer Classifier API",
    description=(
        "Serves colorectal tissue classification, XAI explanations "
        "(Grad-CAM, LIME, SHAP), and Gemini chat assistance."
    ),
    version="0.2.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}


app.include_router(predict.router, prefix="/api")
app.include_router(xai.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


# The production Docker image serves the built Vite app from this same origin,
# keeping the frontend and API on one deployable service.
FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    FRONTEND_ROOT = FRONTEND_DIST.resolve()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        requested_file = (FRONTEND_ROOT / full_path).resolve()
        try:
            requested_file.relative_to(FRONTEND_ROOT)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Not found") from exc

        if requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(FRONTEND_ROOT / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


