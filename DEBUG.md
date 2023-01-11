# Debugging sodar-chrome-plugin

Make sure you have followed the install instructions on
![README.md](https://github.com/dmzoneill/sodarr-chrome-plugin/blob/main/README.md)

# Basic debug

## Service Management

Restart and check the service
```
systemctl restart --user sodarr
systemctl status --user sodarr
```

Output
```
● sodarr.service - Sodarr client service
     Loaded: loaded (/home/dave/.config/systemd/user/sodarr.service; enabled; preset: enabled)
     Active: active (running) since Fri 2023-01-06 12:54:36 GMT; 5 days ago
   Main PID: 961716 (uvicorn)
      Tasks: 3 (limit: 115659)
     Memory: 90.4M
        CPU: 1h 58min 34.925s
     CGroup: /user.slice/user-1000.slice/user@1000.service/app.slice/sodarr.service
             ├─ 961716 /usr/bin/python3 /home/dave/.local/bin/uvicorn --host 0.0.0.0 --port 35000 xdg_open:app --reload
             ├─ 961717 /usr/bin/python3 -c "from multiprocessing.resource_tracker import main;main(4)"
             └─3904042 /usr/bin/python3 -c "from multiprocessing.spawn import spawn_main; spawn_main(tracker_fd=5, pipe_handle=7)" --multiprocessing-fork
```

## Firewall/Port Management
Check the port is open
```
sudo ss -4nlptp | grep 35000
```

Expected Output
```
LISTEN 0   2048  0.0.0.0:35000  0.0.0.0:*  users:(("python3",pid=4149252,fd=3),("uvicorn",pid=4149207,fd=3))
```

## HTTP Check

Check the service is available using curl
```
curl -v http://localhost:35000/
```
Output:
```
*   Trying 127.0.0.1:35000...
* Connected to localhost (127.0.0.1) port 35000 (#0)
> GET / HTTP/1.1
> Host: localhost:35000
> User-Agent: curl/7.87.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< date: Wed, 11 Jan 2023 22:31:28 GMT
< server: uvicorn
< content-length: 17
< content-type: application/json
< 
* Connection #0 to host localhost left intact
{"Hello":"World"}

```
