from __future__ import annotations

import os

import streamlit as st
from PIL import Image, UnidentifiedImageError

from app.inference import Prediction, load_model_adapter


st.set_page_config(
    page_title="Colorectal Histopathology AI",
    page_icon="🧫",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    :root { --ink:#172b2a; --muted:#647775; --line:#dce7e2; --paper:#f6f8f5; --teal:#087f72; --mint:#dff2e9; }
    html, body, [class*="css"] { font-family:'DM Sans',sans-serif; color:var(--ink); }
    .stApp { background:var(--paper); }
    [data-testid="stSidebar"] { background:#eef3ef; border-right:1px solid var(--line); }
    .block-container { max-width:1320px; padding-top:2.4rem; padding-bottom:4rem; }
    .eyebrow { font-family:'DM Mono',monospace; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--teal); }
    .hero { padding:2.1rem 2.3rem; border:1px solid var(--line); border-radius:20px; background:linear-gradient(115deg,#fff 25%,#eaf5ef 100%); margin-bottom:1.5rem; }
    .hero h1 { font-size:2.35rem; line-height:1.1; letter-spacing:-.045em; margin:.45rem 0 .65rem; }
    .hero p { max-width:690px; color:var(--muted); font-size:1.02rem; margin:0; }
    .panel { background:white; border:1px solid var(--line); border-radius:16px; padding:1.25rem 1.4rem; }
    .small-label { color:var(--muted); font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; }
    .big-value { font-size:1.35rem; font-weight:700; margin-top:.25rem; }
    .notice { border-radius:12px; padding:1rem 1.1rem; background:#fff8e8; border:1px solid #eddfb7; color:#624c1b; }
    .stButton > button[kind="primary"] { background:var(--teal); border-color:var(--teal); border-radius:10px; font-weight:600; }
    div[data-testid="stFileUploader"] { background:white; border:1px dashed #9cb7ac; border-radius:14px; padding:.45rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource(show_spinner="Loading the configured model…")
def get_adapter():
    return load_model_adapter()


def validate_prediction(result: Prediction) -> Prediction:
    if not isinstance(result, Prediction):
        raise TypeError("predict(image) must return app.inference.Prediction.")
    if not result.label or not result.scores:
        raise ValueError("Prediction must include a label and at least one class score.")
    if any(not 0 <= float(value) <= 1 for value in result.scores.values()):
        raise ValueError("All scores must be probabilities between 0 and 1.")
    if result.explanation is not None and not isinstance(result.explanation, Image.Image):
        raise TypeError("explanation must be a PIL image or None.")
    return result


with st.sidebar:
    st.markdown('<div class="eyebrow">Project workspace</div>', unsafe_allow_html=True)
    st.markdown("### 🧫 CRC Histology")
    st.caption("Image review demo · model adapter based")
    st.divider()
    st.markdown("**Workflow**")
    st.markdown("1. Add an H&E image\n2. Run the configured model\n3. Review scores and explanation")
    st.divider()
    st.markdown("**Model status**")
    if os.getenv("MODEL_ADAPTER", "").strip():
        st.success("Adapter configured")
    else:
        st.info("Waiting for your trained model")
    st.caption("Model weights are loaded locally by your adapter.")


st.markdown(
    '<section class="hero"><div class="eyebrow">Computational pathology · research demo</div>'
    '<h1>Colorectal tissue review</h1>'
    '<p>Upload a histology image to run your trained model and inspect its output. '
    'The inference interface is ready for your model adapter.</p></section>',
    unsafe_allow_html=True,
)

col_upload, col_details = st.columns([1.15, 0.85], gap="large")
with col_upload:
    st.subheader("Image input")
    max_mb = int(os.getenv("MAX_UPLOAD_MB", "20"))
    file = st.file_uploader(
        "Choose an H&E image",
        type=["png", "jpg", "jpeg", "tif", "tiff", "bmp"],
        help=f"PNG, JPEG, TIFF, or BMP · up to {max_mb} MB",
    )
    image = None
    if file is not None:
        if file.size > max_mb * 1024 * 1024:
            st.error(f"This file is larger than the {max_mb} MB limit.")
        else:
            try:
                image = Image.open(file).convert("RGB")
                st.image(image, caption=f"{file.name} · {image.width} × {image.height}", use_container_width=True)
            except (UnidentifiedImageError, OSError):
                st.error("The uploaded file could not be read as an image.")
with col_details:
    st.subheader("Analysis")
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown("**Run inference**")
    st.caption("Predictions are produced only by the model adapter you configure.")
    run = st.button("Analyze image", type="primary", disabled=image is None, use_container_width=True)
    st.markdown("</div>", unsafe_allow_html=True)
    st.write("")
    st.markdown(
        '<div class="notice"><strong>Research use only</strong><br>Outputs are not a diagnosis '
        'and must not be used to guide patient care.</div>',
        unsafe_allow_html=True,
    )

if run and image is not None:
    try:
        with st.spinner("Analyzing image…"):
            result = validate_prediction(get_adapter().predict(image))
        st.divider()
        st.subheader("Model output")
        left, right = st.columns([0.7, 1.3], gap="large")
        with left:
            st.metric("Top predicted class", result.label)
            st.caption("Scores are model outputs; they may not be calibrated probabilities.")
        with right:
            st.markdown("**Class scores**")
            st.bar_chart(dict(sorted(result.scores.items(), key=lambda item: item[1], reverse=True)))
        if result.explanation is not None:
            st.markdown("**Model explanation**")
            st.image(result.explanation, caption="Explanation returned by the configured adapter", use_container_width=True)
    except Exception as exc:
        st.error(f"Inference could not run: {exc}")

st.divider()
st.caption("Colorectal Histopathology AI · local demo · no images are saved by this app")
