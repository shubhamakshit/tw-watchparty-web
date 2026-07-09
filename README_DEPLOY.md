# Deploying the WatchParty Bridge to a Home Server

This guide explains how to package the Next.js frontend and FastAPI backend into a single, unified package and deploy it on your home server (either directly with Python or via Docker).

---

## Part 1: How Subtitles Work (Updated)
We have added support for **burning subtitles directly into the Twitch stream**. 
* In the UI, selecting a **Subtitle Track** will send the track index to the backend.
* The backend automatically appends the `,soverlay` parameter to VLC's `#transcode` block.
* VLC will burn (render) the selected subtitle track directly onto the video frames before streaming to Twitch.

---

## Part 2: Packaging the Application (Single Port Setup)
We have configured Next.js to build as a static export, and FastAPI to host these static files directly. This means **both the frontend and backend run on a single port (e.g. 8000)**.

To compile the frontend and copy it into the backend folder:
1. Open a terminal.
2. Navigate to the `tw-watchparty-server` directory.
3. Run the automated build script:
   ```bash
   python build_package.py
   ```
This script will build the Next.js app and copy the static build output into a folder named `out` in the FastAPI directory.

---

## Part 3: Deployment Options

### Option A: Running Directly with Python
After running `build_package.py`, you can start the unified server using `uvicorn`:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
* Access the dashboard from any device on your local network: `http://<your-server-ip>:8000`

---

### Option B: Running with Docker / Docker Compose
We have included a `Dockerfile` and `docker-compose.yml` for containerized deployment.

1. Package the build first:
   ```bash
   python build_package.py
   ```
2. Open `docker-compose.yml` and adjust the local path to your movies directory:
   ```yaml
   volumes:
     - /path/to/your/movies/on/server:/movies
   ```
3. Start the container in the background:
   ```bash
   docker compose up -d --build
   ```

Note: VLC has a built-in security policy that blocks running as `root` inside Docker. The provided `Dockerfile` creates a dedicated, non-root `watchparty` user automatically to ensure VLC starts up safely.

---

## Part 4: Configuration Options
You can configure the server using environment variables (which are pre-configured in the Docker setup):

| Variable | Description | Default |
| --- | --- | --- |
| `BASE_MOVIES_DIR` | Directory containing your movies | `C:\Users\Administrator\Downloads` |
| `VLC_PASSWORD` | Password for VLC Telnet/HTTP interfaces | `pass` |
| `VLC_EXECUTABLE` | Path to the VLC executable | `vlc` |
