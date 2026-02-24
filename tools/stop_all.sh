#!/bin/bash
echo pm2 stop all
pm2 stop all
echo stop couchdb
systemctl stop couchdb
