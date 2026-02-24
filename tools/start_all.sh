#!/bin/bash
echo start couchdb
systemctl start couchdb
echo pm2 start all
pm2 start all
