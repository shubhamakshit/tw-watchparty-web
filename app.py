import asyncio
import telnetlib

HOST = "localhost"
PORT = 4200
password = "pass"


async def vlc():
    print("Launching VLC...")
    # Use asyncio's native non-blocking subprocess creator
    process = await asyncio.create_subprocess_exec(
        "vlc",
        r"C:\Users\Administrator\Downloads\bbb_sunflower_1080p_30fps_normal.mp4\bbb_sunflower_1080p_30fps_normal.mp4",
        "--loop",
        r"--sout=#transcode{vcodec=h264,vb=2000,acodec=aac,ab=128,channels=2,soverlay,fps=30,soverlay}:std{access=rtmp,mux=ffmpeg{mux=flv},dst=rtmp://live.twitch.tv/app/live_1518336715_CrQoiygeCkDolYIZ0eF5ZJBFHA1e0i}",
        "--intf",
        "telnet",
        "--telnet-password",
        "pass",
        "-vv",

        "--telnet-port",
        "4200",
        "--extraintf",
        "http",
        "--http-password",
        "pass",
        "--no-sout-all",
        "--sout-keep",
        # This keeps stdout/stderr flowing without blocking your loop
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )


    # Optional: Read logs asynchronously so they don't block

    while True:
        line = await process.stderr.readline()
        if not line:
            break
        print(f"[VLC] {line.decode().strip()}")


async def tl():
    # Now this will actually count down while VLC is running!
    print("Waiting 5 seconds for VLC to start...")
    await asyncio.sleep(5)
    print("Connecting to VLC via Telnet...")

    try:
        tn = telnetlib.Telnet(HOST, PORT)

        if password:
            tn.read_until(b"Password: ")
            tn.write(password.encode('ascii') + b"\n")

        tn.read_until(b"> ")

        tn.write(b"help\n")

        output = tn.read_until(b"> ")
        print(output.decode('ascii'))

        tn.close()
    except ConnectionRefusedError:
        print("Error: Could not connect to VLC. Is the port open?")


async def main():
    # Now gather will actually run them concurrently
    await asyncio.gather(vlc(), tl())


asyncio.run(main())