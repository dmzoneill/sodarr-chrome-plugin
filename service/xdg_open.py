from fastapi import FastAPI, Form
import subprocess
from pprint import pprint

app = FastAPI()

@app.get("/")
def do_nothing():
    return {"Hello": "World"}


@app.post("/open")
async def play_video(video: str = Form(...)):
    cmd = "xdg-open \"" + video + "\""
    print(cmd)
    pprint(subprocess.call(cmd, shell=True, universal_newlines=True))
    return video