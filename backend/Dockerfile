FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# 本番向け（--reload なし）。開発は docker-compose.yml の command で --reload を付与。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
