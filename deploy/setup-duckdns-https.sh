#!/bin/bash
# ================================================
# Script de configuration d'un sous-domaine gratuit DuckDNS
# + HTTPS avec Let's Encrypt
# ================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       🦆 Configuration DuckDNS + HTTPS gratuit             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Instructions
echo -e "${YELLOW}📋 Étapes préalables :${NC}"
echo ""
echo "1. Va sur ${CYAN}https://www.duckdns.org${NC}"
echo "2. Connecte-toi avec Google, GitHub, Twitter, etc."
echo "3. Crée un sous-domaine (ex: mon-portfolio)"
echo "   → Tu obtiendras: ${GREEN}mon-portfolio.duckdns.org${NC}"
echo "4. Copie ton ${YELLOW}TOKEN${NC} affiché sur la page"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Demander les informations
read -p "Ton sous-domaine DuckDNS (sans .duckdns.org): " SUBDOMAIN
read -p "Ton token DuckDNS: " DUCKDNS_TOKEN
read -p "Ton email (pour Let's Encrypt): " EMAIL

if [ -z "$SUBDOMAIN" ] || [ -z "$DUCKDNS_TOKEN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Tous les champs sont requis${NC}"
    exit 1
fi

DOMAIN="${SUBDOMAIN}.duckdns.org"

echo ""
echo -e "${YELLOW}🔄 Configuration en cours pour ${GREEN}${DOMAIN}${NC}..."
echo ""

# 1. Mettre à jour l'IP sur DuckDNS
echo -e "${YELLOW}📡 Mise à jour de l'IP sur DuckDNS...${NC}"
RESULT=$(curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=")
if [ "$RESULT" = "OK" ]; then
    echo -e "${GREEN}✅ IP mise à jour sur DuckDNS${NC}"
else
    echo -e "${RED}❌ Erreur lors de la mise à jour DuckDNS: $RESULT${NC}"
    exit 1
fi

# 2. Créer un script de mise à jour automatique de l'IP
echo -e "${YELLOW}⏰ Configuration de la mise à jour automatique de l'IP...${NC}"
sudo mkdir -p /opt/duckdns
sudo tee /opt/duckdns/duck.sh > /dev/null <<EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | curl -k -o /var/log/duckdns.log -K -
EOF
sudo chmod +x /opt/duckdns/duck.sh

# Ajouter au cron (toutes les 5 minutes)
(crontab -l 2>/dev/null | grep -v duckdns; echo "*/5 * * * * /opt/duckdns/duck.sh >/dev/null 2>&1") | crontab -
echo -e "${GREEN}✅ Mise à jour automatique configurée${NC}"

# 3. Installer Nginx et Certbot
echo -e "${YELLOW}📦 Installation de Nginx et Certbot...${NC}"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 4. Configurer Nginx (sans SSL d'abord)
echo -e "${YELLOW}⚙️ Configuration de Nginx...${NC}"
sudo tee /etc/nginx/sites-available/portfolio-admin > /dev/null <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

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
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/portfolio-admin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 5. Attendre la propagation DNS
echo -e "${YELLOW}⏳ Attente de la propagation DNS (30 secondes)...${NC}"
sleep 30

# 6. Obtenir le certificat SSL
echo -e "${YELLOW}🔐 Obtention du certificat SSL Let's Encrypt...${NC}"
sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL} --redirect

# 7. Configurer le renouvellement automatique
echo -e "${YELLOW}⏰ Configuration du renouvellement automatique du certificat...${NC}"
(crontab -l 2>/dev/null | grep -v certbot; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 8. Configurer le pare-feu
echo -e "${YELLOW}🔥 Configuration du pare-feu...${NC}"
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
# Bloquer l'accès direct au port 3001 depuis l'extérieur
sudo iptables -D INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 3001 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j DROP
if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save
fi

# 9. Mettre à jour le .env
echo -e "${YELLOW}⚙️ Mise à jour du fichier .env...${NC}"
if [ -f ~/portfolio/backend/.env ]; then
    # Ajouter ou mettre à jour ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS" ~/portfolio/backend/.env; then
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN}|" ~/portfolio/backend/.env
    else
        echo "ALLOWED_ORIGINS=https://${DOMAIN}" >> ~/portfolio/backend/.env
    fi
    
    # Activer le mode production
    if grep -q "NODE_ENV" ~/portfolio/backend/.env; then
        sed -i "s|NODE_ENV=.*|NODE_ENV=production|" ~/portfolio/backend/.env
    else
        echo "NODE_ENV=production" >> ~/portfolio/backend/.env
    fi
fi

# 10. Redémarrer le serveur
echo -e "${YELLOW}🔄 Redémarrage du serveur...${NC}"
pm2 restart portfolio-admin 2>/dev/null || true

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    ${GREEN}🎉 Configuration terminée !${CYAN}              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📍 Ton panel admin est maintenant accessible sur :"
echo ""
echo -e "   ${GREEN}https://${DOMAIN}/admin${NC}"
echo ""
echo -e "🔐 ${GREEN}HTTPS activé${NC} avec certificat Let's Encrypt"
echo -e "🦆 ${GREEN}DuckDNS${NC} configuré avec mise à jour automatique de l'IP"
echo -e "🔄 ${GREEN}Renouvellement automatique${NC} du certificat SSL"
echo ""
