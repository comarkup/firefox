#!/bin/bash
cat /etc/services
netstat -lntu
ss -lntu
sudo lsof -i -P -n | grep LISTEN

#sudo lsof -i :$PORT
#sudo kill $PROCESS_ID
