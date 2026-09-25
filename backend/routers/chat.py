import os
from typing import Optional

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from schemas import ChatRequest, ChatResponse, PredictionResult

load_dotenv()

router = APIRouter()

# Initialize Gemini API
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("Warning: GOOGLE_API_KEY not found in environment variables")

# List of model names to try (in order of preference)
MODEL_NAMES = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
]

def get_available_model():
    """Try to find an available model by listing available models."""
    if not api_key:
        return None
    
    try:
        # List all available models
        models = genai.list_models()
        available = []
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                # Extract model name (remove 'models/' prefix if present)
                model_name = m.name.split('/')[-1] if '/' in m.name else m.name
                available.append(model_name)
        
        if available:
            print(f"Available Gemini models: {available}")
            # Prefer flash models (free/faster), then pro models
            for preferred in ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']:
                if preferred in available:
                    return preferred
            # Return first available model
            return available[0]
    except Exception as e:
        print(f"Error listing models: {e}")
        # Fallback: try common model names
        for model_name in MODEL_NAMES:
            try:
                # Just try to create the model object
                genai.GenerativeModel(model_name)
                return model_name
            except Exception:
                continue
    
    return None


def format_prediction_context(context: Optional[PredictionResult]) -> str:
    """Format prediction context for the chatbot."""
    if not context:
        return ""
    
    context_parts = [
        f"Current Classification: {context.predicted_class}",
        f"Confidence: {context.confidence:.2%}",
        "\nClass Probabilities:",
    ]
    
    for class_name, prob in sorted(
        context.class_probabilities.items(),
        key=lambda x: x[1],
        reverse=True
    ):
        context_parts.append(f"  - {class_name}: {prob:.2%}")
    
    if context.per_model_scores:
        context_parts.append("\nPer-Model Scores:")
        for model_score in context.per_model_scores:
            top_class = max(
                model_score.probabilities.items(),
                key=lambda x: x[1]
            )
            context_parts.append(
                f"  - {model_score.model_name}: {top_class[0]} ({top_class[1]:.2%})"
            )
    
    return "\n".join(context_parts)


def create_system_prompt(context: Optional[PredictionResult]) -> str:
    """Create system prompt for the chatbot."""
    base_prompt = """You are a helpful AI assistant integrated into a colorectal cancer histology classification system. 
You can answer general questions and provide medical information about colorectal cancer, histology, and related topics.

When provided with classification context, you can:
- Explain what the predicted tissue type means
- Discuss the confidence level and what it indicates
- Provide information about the tissue classes (TUMOR, STROMA, COMPLEX, LYMPHO, DEBRIS, MUCOSA, ADIPOSE, EMPTY)
- Answer questions about the classification results

Always be accurate, helpful, and professional. If you're unsure about medical information, recommend consulting with a healthcare professional."""
    
    if context:
        context_text = format_prediction_context(context)
        return f"{base_prompt}\n\nCurrent Classification Context:\n{context_text}"
    
    return base_prompt


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat endpoint using Google Gemini API."""
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Google API key not configured. Please set GOOGLE_API_KEY in environment variables."
        )
    
    try:
        # Create system prompt with context if available
        system_prompt = create_system_prompt(request.context)
        
        # Get available model
        model_name = get_available_model()
        if not model_name:
            raise HTTPException(
                status_code=500,
                detail="No available Gemini model found. Please check your API key and model availability."
            )
        
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        
        # Handle empty messages case
        if not request.messages:
            response = model.generate_content(
                system_prompt + "\n\nPlease introduce yourself and explain how you can help."
            )
            if not response or not response.text:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to generate response from AI model"
                )
            return ChatResponse(message=response.text.strip())
        
        # Build conversation history for Gemini
        # Gemini expects a list of dicts with 'role' and 'parts'
        history = []
        
        # Add system instructions
        if request.context:
            # If context exists, start with a setup message
            history.append({
                "role": "user",
                "parts": [system_prompt]
            })
            history.append({
                "role": "model",
                "parts": ["I understand. I have the classification context and I'm ready to help."]
            })
        
        # Convert previous messages (excluding the last one which we'll send separately)
        previous_messages = request.messages[:-1]
        
        # If no context and we have previous messages, prepend system prompt to first user message
        if not request.context and previous_messages:
            first_msg = previous_messages[0]
            if first_msg.role == "user":
                enhanced_first = {
                    "role": "user",
                    "parts": [system_prompt + "\n\nUser: " + first_msg.content]
                }
                history.append(enhanced_first)
                # Add remaining previous messages
                for msg in previous_messages[1:]:
                    history.append({
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [msg.content]
                    })
            else:
                # First message is assistant, add system prompt as separate user message
                history.append({
                    "role": "user",
                    "parts": [system_prompt]
                })
                for msg in previous_messages:
                    history.append({
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [msg.content]
                    })
        else:
            # With context or no previous messages, just add previous messages as-is
            for msg in previous_messages:
                history.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [msg.content]
                })
        
        # Start chat with history
        chat_session = model.start_chat(history=history)
        
        # Send the last message (current user message)
        last_message = request.messages[-1].content
        response = chat_session.send_message(last_message)
        
        if not response or not response.text:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate response from AI model"
            )
        
        return ChatResponse(message=response.text.strip())
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat request: {str(e)}"
        )
