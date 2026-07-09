FROM python:3.11-slim

# Install system dependencies (VLC and FFmpeg)
RUN apt-get update && apt-get install -y \
    vlc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (VLC refuses to run as root by default)
RUN useradd -m watchparty

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files and static frontend build (out directory)
COPY . .

# Set permissions so the watchparty user can write and execute
RUN chown -R watchparty:watchparty /app

# Switch to non-root user
USER watchparty

# Default environment variables
ENV BASE_MOVIES_DIR=/movies
ENV VLC_PASSWORD=pass
ENV VLC_EXECUTABLE=vlc

EXPOSE 8000

# Mount your media folder to /movies when running the container
VOLUME ["/movies"]

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
