#!/bin/bash
# ================================================
# Script de configuration HTTPS avec Nginx + Let's Encrypt
# Pour Oracle Cloud / Ubuntu
# ================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔐 Configuration HTTPS pour Portfolio Admin"
echo "============================================"
echo ""

# Demander le domaine
read -p "Entrez votre nom de domaine (ex: admin.monsite.com): " DOMAIN
read -p "Entrez votre email (pour Let's Encrypt): " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Domaine et email requis${NC}"
    exit 1
fi

# 1. Installer Nginx et Certbot
echo -e "${YELLOW}📦 Installation de Nginx et Certbot...${NC}"
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Configurer Nginx comme reverse proxy
echo -e "${YELLOW}⚙️ Configuration de Nginx...${NC}"

sudo tee /etc/nginx/sites-available/portfolio-admin > /dev/null <<EOF
# Redirection HTTP -> HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificats SSL (seront générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Limite la taille des uploads
    client_max_body_size 10M;
    
    # Logs
    access_log /var/log/nginx/portfolio-admin.access.log;
    error_log /var/log/nginx/portfolio-admin.error.log;

    # Proxy vers Node.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Bloquer l'accès aux fichiers sensibles
    location ~ /\. {
        deny all;
    }
    
    location ~ \.env$ {
        deny all;
    }
}
EOF

# 3. Activer le site
sudo ln -sf /etc/nginx/sites-available/portfolio-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Tester la config Nginx
echo -e "${YELLOW}🔍 Vérification de la configuration Nginx...${NC}"
sudo nginx -t

# 5. Obtenir le certificat SSL
echo -e "${YELLOW}🔐 Obtention du certificat SSL Let's Encrypt...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# 6. Configurer le renouvellement automatique
echo -e "${YELLOW}⏰ Configuration du renouvellement automatique...${NC}"
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 7. Redémarrer Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 8. Configurer le pare-feu
echo -e "${YELLOW}🔥 Configuration du pare-feu...${NC}"
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
# Bloquer l'accès direct au port 3001 depuis l'extérieur
sudo iptables -D INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 3001 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j DROP

# Sauvegarder les règles
if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 Configuration HTTPS terminée !${NC}"
echo "============================================"
echo ""
echo "📍 Ton panel admin est maintenant accessible sur :"
echo -e "   ${GREEN}https://$DOMAIN/admin${NC}"
echo ""
echo "🔐 Certificat SSL valide et renouvelé automatiquement"
echo "🛡️ Headers de sécurité configurés"
echo "🚫 Port 3001 bloqué depuis l'extérieur"
echo ""
echo "⚠️  N'oublie pas de mettre à jour ALLOWED_ORIGINS dans .env :"
echo "   ALLOWED_ORIGINS=https://$DOMAIN"
echo ""
