from fastapi import FastAPI, Form
import subprocess, os
from pprint import pprint
import os
import pwd

def get_username():
    return pwd.getpwuid(os.getuid())[0]

app = FastAPI()

env = {
    "DBUS_SESSION_BUS_ADDRESS":"unix:path=/run/user/" + str(os.getuid()) + "/bus",
    "DESKTOP_SESSION":"gnome",
    "DISPLAY":":1",
    "GDM_LANG":"en_IE.UTF-8",
    "HOME":"/home/" + get_username(),
    "LANG":"en_IE.UTF-8",
    "LANGUAGE":"en_IE:en",
    "SHELL":"/bin/bash",
    "SHLVL":"1",
    "TERM":"xterm-256color",
    "VTE_VERSION":"7000",
    "WINDOWPATH":"2",
    "XAUTHORITY":"/run/user/" + str(os.getuid()) + "/gdm/Xauthority",
    "XDG_CURRENT_DESKTOP":"GNOME",
    "XDG_DATA_DIRS":"/usr/share/gnome:/usr/local/share/:/usr/share/:/var/lib/snapd/desktop",
    "XDG_MENU_PREFIX":"gnome-",
    "XDG_RUNTIME_DIR":"/run/user/" + str(os.getuid()),
    "XDG_SESSION_CLASS":"user",
    "XDG_SESSION_DESKTOP":"gnome",
    "XDG_SESSION_TYPE":"x11",
    "XMODIFIERS":"@im=ibus"
}

@app.get("/")
def do_nothing():
    return {"Hello": "World"}


@app.post("/open")
async def play_video(video: str = Form(...)):
    cmd = "/usr/bin/xdg-open \"" + video + "\""
    print(cmd)
    pprint(subprocess.call(cmd, shell=True, env=env, universal_newlines=True))
    return video
