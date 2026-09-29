"""Hugging Face Gradio Space entrypoint for the existing FastAPI backend."""

import os
import sys
from pathlib import Path

import gradio as gr
import uvicorn


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# The free Space serves API calls on CPU; ZeroGPU access is granted only to
# Gradio functions decorated with spaces.GPU, not arbitrary FastAPI handlers.
os.environ.setdefault("COLORECTAL_FORCE_CPU", "1")

from main import app as api_app  # noqa: E402


demo = gr.Blocks(title="Colorectal Histopathology API")
with demo:
    gr.Markdown(
        """# Colorectal Histopathology API

This Space provides the analysis API used by the web application. Open the
companion website to upload a patch and view its classification and explanation
results. API health is available at `/health`; interactive API documentation is
available at `/docs`.

**Research use only.** Outputs are not a medical diagnosis and must be reviewed
by a qualified pathologist or clinician.
"""
    )


app = gr.mount_gradio_app(api_app, demo, path="/")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "7860")),
        proxy_headers=True,
    )
