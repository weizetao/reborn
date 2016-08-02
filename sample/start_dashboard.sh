#!/bin/bash
nohup ../bin/reborn-config -c config.ini --log-level=debug -L ./log/dashboard.log dashboard --addr=:18087 --http-log=./log/requests.log &>/dev/null &
