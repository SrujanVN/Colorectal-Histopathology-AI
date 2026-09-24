FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_DIR=/app/models

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY docs ./docs
COPY README.md .
RUN mkdir -p /app/models

EXPOSE 8501
CMD ["streamlit", "run", "app/main.py", "--server.address=0.0.0.0"]
