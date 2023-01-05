#!/bin/bash -x
echo "`dirname "$0"`"
cd "`dirname "$0"`"

/usr/bin/nc -z 127.0.0.1 35000

if [ $? -eq 1 ]; then
    echo "launching ... "
    /usr/bin/nohup ~/.local/bin/uvicorn --host 0.0.0.0 --port 35000 xdg_open:app --reload &
fi
