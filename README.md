# sodarr-chrome-plugin
Plugin for chrome that opens videos directly from Sonarr and Radarr, by adding a VLC like icon to the file listing.

## install python requirements

install into local user python includes
```
pip3 install fastapi uvicorn
```

## You have 2 Install options

1. crontab (simpler)
2. systemd

### 1. Crontab (simpler)
Add crontab and update service/run.sh.  This will make sure the service is running.

```
*/5 * * * * /home/.../sodarr-chrome-plugin/service/run.sh
```

### 2. Systemd (more reliable)

Create service file
```
vim ~/.config/systemd/user/sodarr.service
```
Content sodarr.service
```
[Unit]
Description=Sodarr client service
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/dave/src/docker-media-center/config/sodarr-chrome-plugin/service/
ExecStart=/home/dave/.local/bin/uvicorn --host 0.0.0.0 --port 35000 xdg_open:app --reload

[Install]
WantedBy=default.target
```

Enable the service
```
systemctl --user daemon-reload
systemctl --user enable sodarr
systemctl --user restart sodarr
systemctl --user status sodarr
```

## Screenshots

![alt text](https://raw.githubusercontent.com/dmzoneill/sodarr-chrome-plugin/main/img/sonarr.png)

![alt text](https://raw.githubusercontent.com/dmzoneill/sodarr-chrome-plugin/main/img/radarr.png)

