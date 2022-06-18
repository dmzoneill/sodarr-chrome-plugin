#!/bin/bash -x
cd /home/dave/src/docker-media-center/config/sodarr-chrome-plugin/service

/usr/bin/nc -z 127.0.0.1 35000

if [ $? -eq 1 ]; then
    echo "launching ... "
    /usr/bin/nohup /home/dave/.local/bin/uvicorn --host 0.0.0.0 --port 35000 xdg_open:app --reload &
fi
