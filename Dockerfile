FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend /app/backend
COPY models(ResNet50) /app/models(ResNet50)
COPY models(MobileNetV2) /app/models(MobileNetV2)
COPY models(EfficientNetB3) /app/models(EfficientNetB3)
COPY models(DenseNet121) /app/models(DenseNet121)

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


