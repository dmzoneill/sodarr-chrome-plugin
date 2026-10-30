# Sodarr
# https://github.com/dmzoneill/sodarr-chrome-plugin/

import json
import os
import pwd
import subprocess
import sys
from pprint import pprint
from urllib.parse import unquote

from fastapi import FastAPI, Form

try:
    import systemd.daemon
except:
    pass

env = {}
try:
    env = (
        {}
        if sys.platform == "win32"
        else {
            "DBUS_SESSION_BUS_ADDRESS": "unix:path=/run/user/"
            + str(os.getuid())
            + "/bus",
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
except:
    pass


def check_valid_video(infile):
    try:
        if os.path.isdir(infile):
            return [True, None, None]
        elif os.path.isfile(infile):
            lower = infile.lower()
            extensions = [".mp3", ".flac", ".avi", ".mkv", ".avi", ".mp4", ".mpg"]
            for ext in extensions:
                if lower.endswith(ext):
                    return [True, lower, ext]
            return [False, lower, None]
    except Exception as e:
        return [False, False, str(e)]


app = FastAPI()


@app.on_event("startup")
async def startup_event():
    print("Startup complete")
    try:
        systemd.daemon.notify("READY=1")
    except:
        pass


@app.get("/")
def do_nothing():
    return {"Hello": "World"}


@app.post("/open")
async def play_video(video: str = Form(...)):
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
