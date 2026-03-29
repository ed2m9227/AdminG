FROM python:3.13-slim

WORKDIR /app

# Install system dependencies needed by reportlab and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY frontend-dist/ ./frontend-dist/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Create directory for SQLite database
RUN mkdir -p /data

# Expose port
EXPOSE 8000

# Start the server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
