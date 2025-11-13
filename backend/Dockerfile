FROM python:3.12-slim

WORKDIR /app
COPY backend/requirements.txt /app/

# extra libs for pdfplumber/pptx parsing
RUN apt-get update && apt-get install -y \
    build-essential poppler-utils libjpeg62-turbo-dev zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

COPY backend /app/backend

ENV PYTHONUNBUFFERED=1
ENV OLLAMA_URL=${OLLAMA_URL}
ENV OLLAMA_MODEL=${OLLAMA_MODEL}
ENV DATABASE_URL=${DATABASE_URL}
ENV SECRET_KEY=${SECRET_KEY}

# Expose Flask/Gunicorn port
EXPOSE 5000

# Gunicorn entry (app module: backend/app.py exposes "app")
CMD ["gunicorn", "-b", "0.0.0.0:5000", "backend.app:app", "--workers", "2", "--threads", "4", "--timeout", "1500"]
