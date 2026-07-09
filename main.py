import asyncio
import os
import shutil
import subprocess
import socket
import time
import uuid
from collections import deque
from pathlib import Path
from typing import Dict, List, Optional

import telnetlib
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------- Config ----------------

default_movies_dir = Path.home() / "Downloads"
if not default_movies_dir.exists():
    default_movies_dir = Path.home()

BASE_MOVIES_DIR = Path(os.getenv("BASE_MOVIES_DIR", default_movies_dir)).resolve()
PASSWORD = os.getenv("VLC_PASSWORD", "pass")
TELNET_HOST = "localhost"
VLC_EXECUTABLE = os.getenv("VLC_EXECUTABLE", "vlc")

app = FastAPI(title="VLC Control API", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Utilities ----------------

def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("localhost", 0))
        return s.getsockname()[1]


# ---------------- Models ----------------

class StartVLCRequest(BaseModel):
    video_path: str = Field(..., description="Path relative to BASE_MOVIES_DIR, or absolute")
    stream_key: Optional[str] = Field(None, description="Twitch stream key")
    rtmp_url: Optional[str] = Field(None, description="Full RTMP dst, overrides stream_key")
    loop: bool = True
    video_bitrate: int = 2000
    audio_bitrate: int = 128
    fps: int = 30
    name: Optional[str] = None
    audio_track: Optional[int] = Field(None, description="Audio track index (0 to n)")
    sub_track: Optional[int] = Field(None, description="Subtitle track index (0 to n)")


class InstanceInfo(BaseModel):
    id: str
    name: str
    pid: Optional[int]
    telnet_port: int
    http_port: int
    video_path: str
    status: str
    started_at: Optional[float]
    returncode: Optional[int]


class ExecRequest(BaseModel):
    command: str


# ---------------- VLC instance / manager ----------------

class VLCInstance:
    def __init__(self, instance_id: str, name: str, video_path: str, telnet_port: int, http_port: int):
        self.id = instance_id
        self.name = name
        self.video_path = video_path
        self.telnet_port = telnet_port
        self.http_port = http_port
        self.process: Optional[subprocess.Popen] = None
        self.status = "starting"
        self.started_at: Optional[float] = None
        self.log_lines: deque = deque(maxlen=200)
        self._reader_task: Optional[asyncio.Task] = None

    def to_info(self) -> InstanceInfo:
        return InstanceInfo(
            id=self.id,
            name=self.name,
            pid=self.process.pid if self.process else None,
            telnet_port=self.telnet_port,
            http_port=self.http_port,
            video_path=self.video_path,
            status=self.status,
            started_at=self.started_at,
            returncode=self.process.poll() if self.process else None,
        )

    async def _read_logs(self):
        if not self.process or not self.process.stderr:
            return

        def read_loop():
            try:
                for line in self.process.stderr:
                    self.log_lines.append(line.decode(errors="replace").strip())
            except Exception as e:
                self.log_lines.append(f"[log reader error] {e}")
            finally:
                if self.status not in ("stopped", "killed"):
                    self.status = "exited"

        await asyncio.to_thread(read_loop)


class VLCManager:
    def __init__(self):
        self.instances: Dict[str, VLCInstance] = {}
        self._lock = asyncio.Lock()

    def _resolve_video_path(self, raw: str) -> Path:
        p = Path(raw)
        if not p.is_absolute():
            p = BASE_MOVIES_DIR / raw
        return p.resolve()

    async def start(self, req: StartVLCRequest) -> VLCInstance:
        async with self._lock:
            video_path = self._resolve_video_path(req.video_path)
            if not video_path.exists():
                raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")
            if shutil.which(VLC_EXECUTABLE) is None:
                raise HTTPException(status_code=500, detail="vlc executable not found on PATH")

            dst = req.rtmp_url
            if not dst:
                if not req.stream_key:
                    raise HTTPException(status_code=400, detail="Provide rtmp_url or stream_key")
                dst = f"rtmp://live.twitch.tv/app/{req.stream_key}"

            instance_id = uuid.uuid4().hex[:8]
            name = req.name or instance_id
            telnet_port = find_free_port()
            http_port = find_free_port()

            transcode_opts = f"vcodec=h264,vb={req.video_bitrate},acodec=aac,ab={req.audio_bitrate},channels=2,fps={req.fps}"
            if req.sub_track is not None:
                transcode_opts += ",soverlay"

            sout = (
                f"#transcode{{{transcode_opts}}}"
                f":std{{access=rtmp,mux=ffmpeg{{mux=flv}},dst={dst}}}"
            )

            args = [
                VLC_EXECUTABLE,
                str(video_path),
                f"--sout={sout}",
                "--intf", "telnet",
                "--telnet-password", PASSWORD,
                "--telnet-port", str(telnet_port),
                "--extraintf", "http",
                "--http-password", PASSWORD,
                "--http-port", str(http_port),
                "--no-sout-all",
                "--sout-keep",
                "-vv",
            ]
            if req.loop:
                args.append("--loop")
            if req.audio_track is not None:
                args.append(f"--audio-track={req.audio_track}")
            if req.sub_track is not None:
                args.append(f"--sub-track={req.sub_track}")

            instance = VLCInstance(instance_id, name, str(video_path), telnet_port, http_port)

            import traceback
            print("--- Launching VLC ---")
            print(f"Executable: {VLC_EXECUTABLE}")
            print(f"Resolved executable: {shutil.which(VLC_EXECUTABLE)}")
            print(f"Arguments: {args}")
            try:
                process = await asyncio.to_thread(
                    subprocess.Popen,
                    args,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                print(f"Successfully launched VLC. PID: {process.pid}")
            except Exception as e:
                print(f"Exception while launching VLC: {e}")
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Failed to launch VLC: {e}")

            instance.process = process
            instance.started_at = time.time()
            instance._reader_task = asyncio.create_task(instance._read_logs())
            self.instances[instance_id] = instance

        ok = await self._wait_for_telnet(instance, timeout=8)
        instance.status = "running" if ok else "error"
        if not ok:
            instance.log_lines.append("Telnet interface did not become ready in time.")
        return instance

    async def _wait_for_telnet(self, instance: VLCInstance, timeout: float = 8) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if instance.process.poll() is not None:
                return False
            try:
                if await asyncio.to_thread(self._telnet_probe, instance.telnet_port):
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.5)
        return False

    @staticmethod
    def _telnet_probe(port: int) -> bool:
        tn = None
        try:
            tn = telnetlib.Telnet(TELNET_HOST, port, timeout=2)
            tn.read_until(b"Password: ", timeout=2)
            tn.write(PASSWORD.encode("ascii") + b"\n")
            tn.read_until(b"> ", timeout=2)
            return True
        except Exception:
            return False
        finally:
            if tn:
                tn.close()

    def get(self, instance_id: str) -> VLCInstance:
        inst = self.instances.get(instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail=f"No such instance: {instance_id}")
        return inst

    def list(self) -> List[VLCInstance]:
        return list(self.instances.values())

    async def stop(self, instance_id: str, force: bool = False) -> VLCInstance:
        inst = self.get(instance_id)
        if inst.process is None or inst.process.poll() is not None:
            inst.status = "stopped" if inst.process is None else "exited"
            return inst
        try:
            if force:
                inst.process.kill()
            else:
                inst.process.terminate()
            try:
                await asyncio.wait_for(asyncio.to_thread(inst.process.wait), timeout=6)
            except asyncio.TimeoutError:
                if not force:
                    inst.process.kill()
                    await asyncio.wait_for(asyncio.to_thread(inst.process.wait), timeout=6)
            inst.status = "killed" if force else "stopped"
        except ProcessLookupError:
            inst.status = "stopped"
        except Exception as e:
            inst.log_lines.append(f"[stop error] {e}")
            raise HTTPException(status_code=500, detail=f"Failed to stop instance: {e}")
        return inst

    def remove(self, instance_id: str):
        self.instances.pop(instance_id, None)


manager = VLCManager()


def _telnet_exec(port: int, command: str, timeout: float = 5) -> str:
    tn = telnetlib.Telnet(TELNET_HOST, port, timeout=timeout)
    try:
        tn.read_until(b"Password: ", timeout=timeout)
        tn.write(PASSWORD.encode("ascii") + b"\n")
        tn.read_until(b"> ", timeout=timeout)
        tn.write(command.encode("ascii", errors="replace") + b"\n")
        return tn.read_until(b"> ", timeout=timeout).decode("ascii", errors="replace")
    finally:
        tn.close()


# ---------------- Routes ----------------

@app.get("/")
async def root():
    return {"message": "VLC Control API"}


@app.get("/movies/probe/{path:path}")
async def probe_movie(path: str):
    import json
    target = (BASE_MOVIES_DIR / path).resolve()
    try:
        target.relative_to(BASE_MOVIES_DIR)
    except ValueError:
        raise HTTPException(status_code=400, detail="Path escapes movies directory")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Path is a directory")

    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "stream=index,codec_type,codec_name:stream_tags=language,title",
        "-of", "json",
        str(target)
    ]
    try:
        process = await asyncio.to_thread(
            subprocess.run,
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        data = json.loads(process.stdout)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to probe file: {e}")

    streams = data.get("streams", [])
    audio_tracks = []
    sub_tracks = []
    
    audio_index = 0
    sub_index = 0
    
    for stream in streams:
        t = stream.get("codec_type")
        tags = stream.get("tags", {})
        language = tags.get("language", "und")
        title = tags.get("title", "")
        codec = stream.get("codec_name", "")
        
        info = {
            "vlc_index": None,
            "ffprobe_index": stream.get("index"),
            "codec": codec,
            "language": language,
            "title": title
        }
        
        if t == "audio":
            info["vlc_index"] = audio_index
            audio_tracks.append(info)
            audio_index += 1
        elif t == "subtitle":
            info["vlc_index"] = sub_index
            sub_tracks.append(info)
            sub_index += 1

    return {
        "audio": audio_tracks,
        "subtitle": sub_tracks
    }


@app.get("/movies")
@app.get("/movies/{path:path}")
async def get_movies(path: str = ""):
    target = (BASE_MOVIES_DIR / path).resolve()
    try:
        target.relative_to(BASE_MOVIES_DIR)
    except ValueError:
        raise HTTPException(status_code=400, detail="Path escapes movies directory")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    try:
        subfolders = [f.name for f in os.scandir(target) if f.is_dir() and not f.name.startswith(".")]
        files = [f.name for f in os.scandir(target) if not f.is_dir() and not f.name.startswith(".")]
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Permission denied accessing directory: {target}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan directory: {e}")
    return {"message": {"files": files, "subfolders": subfolders}}


@app.post("/vlc/start", response_model=InstanceInfo)
async def start_vlc(req: StartVLCRequest):
    instance = await manager.start(req)
    return instance.to_info()


@app.get("/vlc/instances", response_model=List[InstanceInfo])
async def list_instances():
    return [i.to_info() for i in manager.list()]


@app.get("/vlc/{instance_id}", response_model=InstanceInfo)
async def get_instance(instance_id: str):
    return manager.get(instance_id).to_info()


@app.get("/vlc/{instance_id}/logs")
async def get_logs(instance_id: str, lines: int = 50):
    inst = manager.get(instance_id)
    return {"status": "success", "message": list(inst.log_lines)[-lines:]}


@app.post("/vlc/{instance_id}/stop", response_model=InstanceInfo)
async def stop_instance(instance_id: str):
    return (await manager.stop(instance_id, force=False)).to_info()


@app.post("/vlc/{instance_id}/kill", response_model=InstanceInfo)
async def kill_instance(instance_id: str):
    return (await manager.stop(instance_id, force=True)).to_info()


@app.delete("/vlc/{instance_id}")
async def delete_instance(instance_id: str):
    inst = manager.get(instance_id)
    if inst.process and inst.process.poll() is None:
        await manager.stop(instance_id, force=True)
    manager.remove(instance_id)
    return {"status": "success", "message": f"Removed instance {instance_id}"}


@app.post("/vlc/{instance_id}/exec")
async def exec_command(instance_id: str, body: ExecRequest):
    inst = manager.get(instance_id)
    if inst.process is None or inst.process.poll() is not None:
        raise HTTPException(status_code=409, detail="Instance is not running")
    try:
        output = await asyncio.to_thread(_telnet_exec, inst.telnet_port, body.command)
        return {"status": "success", "message": output}
    except (ConnectionRefusedError, OSError) as e:
        raise HTTPException(status_code=502, detail=f"Could not connect to VLC telnet: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exec failed: {e}")


@app.get("/vlc/{instance_id}/status")
async def instance_status(instance_id: str):
    inst = manager.get(instance_id)
    if inst.process is None or inst.process.poll() is not None:
        return {"status": "error", "message": "Instance is not running"}
    try:
        res = await asyncio.to_thread(
            requests.get,
            f"http://localhost:{inst.http_port}/requests/status.json",
            auth=("", PASSWORD),
            timeout=5,
        )
        return {"status": "success", "message": res.json()}
    except Exception as e:
        return {"status": "error", "message": f"Could not connect to VLC HTTP interface. Error: {e}"}


@app.on_event("shutdown")
async def shutdown_event():
    for inst in list(manager.instances.values()):
        if inst.process and inst.process.poll() is None:
            try:
                inst.process.kill()
            except Exception:
                pass


from fastapi.responses import FileResponse

# Serve Next.js static export files from 'out' folder
OUT_DIR = Path(__file__).parent / "out"

@app.get("/{catchall:path}", include_in_schema=False)
async def serve_static(catchall: str):
    if not OUT_DIR.exists():
        return {"message": "VLC Control API (Frontend static files 'out' folder not found)"}
    
    # Try to serve exact file requested
    file_path = (OUT_DIR / catchall).resolve()
    try:
        file_path.relative_to(OUT_DIR)
        if file_path.is_file():
            return FileResponse(file_path)
    except ValueError:
        pass
        
    # Otherwise fall back to index.html (SPA routing)
    index_path = OUT_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
        
    return {"message": "VLC Control API (index.html not found)"}