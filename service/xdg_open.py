# Sodarr
# https://github.com/dmzoneill/sodarr-chrome-plugin/
"""Local helper service that opens media files with the desktop default player."""

import contextlib
import json
import os
import pwd
import subprocess
import sys
from pprint import pprint
from urllib.parse import unquote

from fastapi import FastAPI, Form

try:
    from systemd import daemon as SYSTEMD_DAEMON
except ImportError:
    SYSTEMD_DAEMON = None

env = {}
try:
    env = (
        {}
        if sys.platform == "win32"
        else {
            "DBUS_SESSION_BUS_ADDRESS": "unix:path=/run/user/" + str(os.getuid()) + "/bus",
            "DESKTOP_SESSION": "gnome",
            "DISPLAY": ":1",
            "GDM_LANG": "en_IE.UTF-8",
            "HOME": "/home/" + pwd.getpwuid(os.getuid())[0],
            "LANG": "en_IE.UTF-8",
            "LANGUAGE": "en_IE:en",
            "SHELL": "/bin/bash",
            "SHLVL": "1",
            "TERM": "xterm-256color",
            "VTE_VERSION": "7000",
            "WINDOWPATH": "2",
            "XAUTHORITY": "/run/user/" + str(os.getuid()) + "/gdm/Xauthority",
            "XDG_CURRENT_DESKTOP": "GNOME",
            "XDG_DATA_DIRS": "/usr/share/gnome:/usr/local/share/:/usr/share/:/var/lib/snapd/desktop",
            "XDG_MENU_PREFIX": "gnome-",
            "XDG_RUNTIME_DIR": "/run/user/" + str(os.getuid()),
            "XDG_SESSION_CLASS": "user",
            "XDG_SESSION_DESKTOP": "gnome",
            "XDG_SESSION_TYPE": "x11",
            "XMODIFIERS": "@im=ibus",
        }
    )
except (AttributeError, KeyError, OSError):
    env = {}


def check_valid_video(infile):
    """Return [ok, lowered_path, extension_or_error] for a candidate media path."""
    try:
        if os.path.isdir(infile):
            return [True, None, None]
        if os.path.isfile(infile):
            lower = infile.lower()
            extensions = [".mp3", ".flac", ".avi", ".mkv", ".avi", ".mp4", ".mpg"]
            for ext in extensions:
                if lower.endswith(ext):
                    return [True, lower, ext]
            return [False, lower, None]
    except (OSError, TypeError, ValueError) as e:
        return [False, False, str(e)]
    return None


app = FastAPI()


@app.on_event("startup")
async def startup_event():
    """Tell systemd the service is ready (when running under systemd)."""
    print("Startup complete")
    if SYSTEMD_DAEMON is not None:
        with contextlib.suppress(Exception):
            SYSTEMD_DAEMON.notify("READY=1")


@app.get("/")
def do_nothing():
    """Health check endpoint."""
    return {"Hello": "World"}


@app.post("/open")
def play_video(video: str = Form(...)):
    """Open the posted media path with xdg-open (no shell)."""
    target = unquote(video)
    path_check = check_valid_video(target)
    # Require an absolute path so a value like "-x" can't be read as an option.
    if path_check[0] and os.path.isabs(target):
        if sys.platform == "win32":
            print("Windows supported untested and unmaintained")
            os.startfile(target)  # nosec - no shell involved
        else:
            # Pass the path as a single argv element (no shell) so quotes or
            # shell metacharacters in the filename cannot inject commands.
            cmd = ["/usr/bin/xdg-open", target]
            print(cmd)
            pprint(subprocess.call(cmd, env=env, universal_newlines=True))
    return json.dumps(path_check)
