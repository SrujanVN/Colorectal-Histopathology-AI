import asyncio
import json
import logging
import os
import random
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types

from schemas import ChatRequest, ChatResponse, PredictionResult

load_dotenv()
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

router = APIRouter()
logger = logging.getLogger(__name__)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
MAX_CHAT_MESSAGES = 12
MAX_MESSAGE_CHARS = 4000


def provider_error_message(exc: Exception) -> tuple[int, str] | None:
    """Map transient Gemini errors to clear, actionable UI messages."""
    code = getattr(exc, "code", None)
    if code == 429:
        return (
            429,
            "Gemini's rate limit or daily quota for this Google project was reached. "
            "Check Google AI Studio usage and rate limits, then wait for the limit to reset.",
        )
    if code == 503:
        return (
            503,
            "Gemini is temporarily overloaded. The assistant retried; please wait briefly and try again.",
        )
    return None


@router.get("/chat/status")
async def chat_status() -> dict[str, str | bool]:
    """Expose configuration state without returning or logging the API key."""
    configured = bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
    return {"configured": configured, "model": MODEL_NAME}


def format_prediction_context(context: PredictionResult | None) -> str:
    if not context:
        return "No analysis result is currently attached to this conversation."

    ranked_classes = sorted(
        context.class_probabilities.items(), key=lambda item: item[1], reverse=True
    )
    class_scores = "\n".join(
        f"- {class_name}: {probability:.1%}" for class_name, probability in ranked_classes
    )
    model_results = ""
    if context.per_model_scores:
        model_results = "\nPer-model top classes:\n" + "\n".join(
            f"- {score.model_name}: {max(score.probabilities.items(), key=lambda item: item[1])[0]} "
            f"({max(score.probabilities.values()):.1%})"
            for score in context.per_model_scores
            if score.probabilities
        )

    return (
        f"Predicted class: {context.predicted_class}\n"
        f"Model confidence: {context.confidence:.1%}\n"
        f"Class probabilities:\n{class_scores}{model_results}"
    )


def create_system_prompt(context: PredictionResult | None) -> str:
    return f"""You are the Gemini-powered research assistant in a colorectal histopathology analysis application.
Answer the user's actual question first. Be warm, respectful, clear, and concise. Do not repeat a generic introduction or list your capabilities unless asked. Use plain language and only use short headings or bullets when they improve readability. You may use standard Markdown formatting.

You can explain tissue classes, model outputs, confidence, class probabilities, ensemble behavior, and Grad-CAM, LIME, or SHAP. Distinguish model output from established fact. A confidence score is not diagnostic certainty. Never claim that this application makes a medical diagnosis or recommend treatment. For patient-specific interpretation or health decisions, kindly direct the user to a qualified pathologist or clinician. State uncertainty instead of guessing.

Current analysis context:
{format_prediction_context(context)}"""


def _generate_response_stream(request: ChatRequest, api_key: str):
    client = genai.Client(api_key=api_key)
    # Bound chat history so a long-lived browser conversation does not keep
    # consuming more input tokens and hitting project rate limits.
    conversation = request.messages[-MAX_CHAT_MESSAGES:]
    while conversation and conversation[0].role != "user":
        conversation = conversation[1:]
    contents = []
    for message in conversation:
        role = "model" if message.role == "assistant" else "user"
        text = message.content[-MAX_MESSAGE_CHARS:]
        if contents and contents[-1].role == role:
            contents[-1].parts.append(types.Part.from_text(text=f"\n\n{text}"))
        else:
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text)]))
    yield from client.models.generate_content_stream(
        model=MODEL_NAME,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=create_system_prompt(request.context),
            max_output_tokens=500,
            thinking_config=types.ThinkingConfig(thinking_level="low"),
        ),
    )


def _next_response_text(stream) -> str | None:
    while True:
        try:
            chunk = next(stream)
        except StopIteration:
            return None
        text = chunk.text or ""
        if text:
            return text


@router.post("/chat")
async def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Please send a message to start the conversation.")

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini chat is not configured. Add GOOGLE_API_KEY as a Hugging Face Space "
                "secret in Settings → Variables and secrets, then restart the Space. "
                "For local development, put it in backend/.env."
            ),
        )

    async def stream_events():
        response_stream = None
        first_text = None
        yield ": connected\n\n"
        for attempt in range(3):
            response_stream = _generate_response_stream(request, api_key)
            try:
                first_text = await asyncio.to_thread(_next_response_text, response_stream)
                break
            except Exception as exc:
                if getattr(exc, "code", None) != 503 or attempt == 2:
                    logger.exception("Gemini chat request failed")
                    provider_error = provider_error_message(exc)
                    message = provider_error[1] if provider_error else "Gemini could not respond right now. Please try again shortly."
                    yield f"event: error\ndata: {json.dumps({'message': message})}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                logger.warning("Gemini is temporarily unavailable; retrying chat request (%s/2)", attempt + 1)
                await asyncio.sleep((1.5 * (2 ** attempt)) + random.uniform(0, 0.5))

        # Start the SSE response before waiting on Gemini so a slow first token
        # cannot turn into a generic gateway 502 in the browser.
        if response_stream is None or first_text is None:
            yield f"event: error\ndata: {json.dumps({'message': 'Gemini returned an empty response. Please try again.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        while first_text is not None:
            yield f"data: {json.dumps({'text': first_text}, ensure_ascii=False)}\n\n"
            try:
                first_text = await asyncio.to_thread(_next_response_text, response_stream)
            except Exception as exc:
                logger.exception("Gemini response stream interrupted")
                provider_error = provider_error_message(exc)
                message = provider_error[1] if provider_error else "I couldn’t finish that reply. Please try again."
                yield f"event: error\ndata: {json.dumps({'message': message})}\n\n"
                return
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
