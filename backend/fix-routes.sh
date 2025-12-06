#!/bin/bash
cd ~/portfolio-admin/backend

# Remplacer la route /admin pour rediriger vers login
sed -i "s|app.get('/admin', (req, res) => {|app.get('/admin', (req, res) => {\n    res.redirect('/admin/login.html');\n});\n\napp.get('/admin/', (req, res) => {|" server.js
sed -i "s|res.sendFile(path.join(__dirname, '../admin/index.html'));|res.redirect('/admin/login.html');|" server.js

# Redémarrer PM2
pm2 restart portfolio-admin
echo "Done!"
