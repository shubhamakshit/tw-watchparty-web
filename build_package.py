import os
import shutil
import subprocess
from pathlib import Path

# Paths relative to the script location
server_dir = Path(__file__).parent.resolve()
web_dir = server_dir / "frontend"
server_out_dir = server_dir / "out"

print(f"Building Next.js frontend in {web_dir}...")
try:
    subprocess.run("npm run build", shell=True, cwd=str(web_dir), check=True)
except Exception as e:
    print(f"Failed to build frontend: {e}")
    exit(1)

web_out_dir = web_dir / "out"
if not web_out_dir.exists():
    print(f"Error: Next.js 'out' folder was not generated at {web_out_dir}!")
    exit(1)

print(f"Cleaning previous build in {server_out_dir}...")
if server_out_dir.exists():
    shutil.rmtree(server_out_dir)

print(f"Copying build files to {server_out_dir}...")
shutil.copytree(web_out_dir, server_out_dir)

print("\n==========================================================================")
print("Build successfully packaged!")
print("You can now run the backend server, and it will host the frontend")
print("dashboard directly on http://localhost:8000 (or whichever port you choose).")
print("==========================================================================\n")
