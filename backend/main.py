from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import predict, xai  # type: ignore[attr-defined]


app = FastAPI(
    title="Colorectal Cancer Classifier API",
    description=(
        "Serves colorectal cancer image classification and XAI explanations "
        "(Grad-CAM, LIME, SHAP)."
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


