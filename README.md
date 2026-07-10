---
title: WatchParty Bridge
emoji: 🎬
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# tw-watchparty-server (WatchParty Bridge)

WatchParty Bridge is a high-performance VLC transcode controller, Twitch streamer, and Media/Download Manager. It provides a unified web dashboard to stream local/downloaded video files to Twitch with fully custom transcode profiles, hot track switching, and an integrated downloader/scraper.

---

## Key Features

### 1. Advanced Twitch Stream & Transcode Customization
* **Custom Transcode Parameters**: Modify video/audio codecs, presets, samplerates, scaling, and keyframe intervals on the fly.
* **Default SOUT Preset**: Optimized specifically for Twitch streaming:
  `#transcode{vcodec=h264,vb=3000,scale=Auto,acodec=mp4a,ab=128,channels=2,samplerate=44100,fps=60,soverlay,venc=x264{preset=veryfast,keyint=60}}`
* **Dynamic Stream Reconfiguration**: Subtitle burn-ins and audio tracks are locked during active transcodes. Our dynamic reconfiguration system lets you switch audio tracks/subtitles by gracefully restarting the stream on the same port in under a second.

### 2. Media & Downloader Dashboard
* **Native In-House Downloader**: Pure Python HTTP/HTTPS chunk-downloader with Zero system daemon dependencies.
* **Pause & Resume Support**: Utilizes HTTP range requests to pause and resume downloads at any point.
* **Persistent Sessions**: Download path selections are persisted in `localStorage` and automatically synchronized with the backend.
* **File Explorer**: Browse files recursively on the host system, delete files, and click **Play** to automatically prepopulate stream startup configurations.

### 3. Integrated Acer Movies Scraper
* **Scraper APIs**: Search movies and TV series directly on `acermovies.fun` from the dashboard.
* **Season & Episode Selector**: Fetches episodes and displays them in a clean checklist.
* **Checklist Bulk Download**: Select specific episodes or select the entire season to queue them sequentially with one click.
* **Silent Background Queues**: All browser alert alerts are muted for seamless background additions.

---

## Installation & Running

### Option 1: Running Locally (Recommended)

#### Prerequisites
1. Install [VLC Media Player](https://www.videolan.org/vlc/). Make sure the `vlc` executable is in your system PATH, or specify its location via the `VLC_EXECUTABLE` environment variable.
2. Install Python 3.10 or higher.

#### Setup & Start
1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/shubhamakshit/tw-watchparty-web.git
   cd tw-watchparty-web
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   python main.py
   ```
4. Open your browser and navigate to `http://localhost:8000`.

---

### Option 2: Running with Docker

1. Ensure Docker and Docker Compose are installed.
2. Build and start the containers:
   ```bash
   docker-compose up --build
   ```
3. The server will start on port `8000` and map the `./movies` folder to `/movies` inside the container.

---

## Environment Variables

Configure the server behavior using these environment variables (or setting them inside your shell/Docker configs):

* `BASE_MOVIES_DIR`: The root directory where files are browsed and downloads are saved (Defaults to the user's home directory `~`).
* `VLC_PASSWORD`: The Telnet password used by the backend to control VLC instances (Default: `pass`).
* `VLC_EXECUTABLE`: Path to the VLC executable (Default: `vlc`).

---

## Frontend Development & Rebuilding

The frontend is built using Next.js, Mantine components, and Tabler icons inside the `frontend` folder.

If you make modifications to the frontend code and want to package it for distribution:
1. Run the build packaging script in the root directory:
   ```bash
   python build_package.py
   ```
2. The script will automatically compile the Next.js static export and copy the assets to the `out` directory, which is served directly by the Python FastAPI backend.
