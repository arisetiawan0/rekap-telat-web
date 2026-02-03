# Gunakan Python slim
FROM python:3.11-slim

# Biar pip tidak interaktif
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Direktori kerja di dalam container
WORKDIR /app

# Copy requirements dulu (biar cache build efisien)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy semua source code ke container
COPY . .

# Environment untuk Flask
ENV FLASK_ENV=production

# Port default di dalam container
EXPOSE 5000

# Jalankan pakai gunicorn
# Render / Railway biasanya meng-set $PORT sendiri,
# jadi kita pakai ${PORT:-5000} (default 5000 bila PORT tidak ada)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"]
