#!/bin/bash
cd ~/portfolio-admin/backend
sed -i "s|app.use(express.static(path.join(__dirname, '../admin')));|app.use('/admin', express.static(path.join(__dirname, '../admin')));|" server.js
grep -n "express.static" server.js
pm2 restart portfolio-admin
pm2 logs portfolio-admin --lines 5 --nostream
