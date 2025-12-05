#!/bin/bash
# ================================================
# Script de déploiement Portfolio Admin - Oracle Cloud
# ================================================

set -e

echo "🚀 Déploiement du Portfolio Admin sur Oracle Cloud"
echo "=================================================="

# Variables (à modifier selon ta config)
APP_DIR="$HOME/portfolio"
BACKEND_DIR="$APP_DIR/backend"
REPO_URL="https://github.com/SudoKipedia/portfolio.git"
NODE_VERSION="20"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Mise à jour du système
echo -e "${YELLOW}📦 Mise à jour du système...${NC}"
sudo apt-get update -y || sudo dnf update -y

# 2. Installation de Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Installation de Node.js ${NODE_VERSION}...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - 2>/dev/null || \
    sudo dnf module install -y nodejs:${NODE_VERSION}
    sudo apt-get install -y nodejs 2>/dev/null || sudo dnf install -y nodejs
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# 3. Installation de Git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}📦 Installation de Git...${NC}"
    sudo apt-get install -y git 2>/dev/null || sudo dnf install -y git
fi
echo -e "${GREEN}✅ Git $(git --version)${NC}"

# 4. Installation de PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installation de PM2...${NC}"
    sudo npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 installé${NC}"

# 5. Cloner ou mettre à jour le repo
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}📥 Mise à jour du repository...${NC}"
    cd "$APP_DIR"
    git pull
else
    echo -e "${YELLOW}📥 Clonage du repository...${NC}"
    git clone "$REPO_URL" "$APP_DIR"
fi
echo -e "${GREEN}✅ Repository prêt${NC}"

# 6. Installation des dépendances
echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
cd "$BACKEND_DIR"
npm install --production
echo -e "${GREEN}✅ Dépendances installées${NC}"

# 7. Configuration du .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚙️ Configuration du fichier .env...${NC}"
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Modifie le fichier .env avec tes valeurs !${NC}"
    echo "   nano $BACKEND_DIR/.env"
    echo ""
fi

# 8. Configuration du pare-feu
echo -e "${YELLOW}🔥 Configuration du pare-feu...${NC}"
sudo iptables -C INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null || \
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
# Sauvegarder les règles iptables
if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save
elif command -v iptables-save &> /dev/null; then
    sudo iptables-save | sudo tee /etc/iptables.rules > /dev/null
fi
echo -e "${GREEN}✅ Port 3001 ouvert${NC}"

# 9. Lancer avec PM2
echo -e "${YELLOW}🚀 Démarrage du serveur avec PM2...${NC}"
cd "$BACKEND_DIR"
pm2 delete portfolio-admin 2>/dev/null || true
pm2 start server.js --name "portfolio-admin"
pm2 save

# 10. Configuration du démarrage automatique
echo -e "${YELLOW}⚙️ Configuration du démarrage automatique...${NC}"
pm2 startup | tail -1 | bash 2>/dev/null || true
pm2 save
echo -e "${GREEN}✅ Démarrage automatique configuré${NC}"

# Afficher le statut
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Déploiement terminé !${NC}"
echo "=================================================="
echo ""
pm2 status
echo ""
echo "📍 Ton panel admin est accessible sur :"
echo "   http://$(curl -s ifconfig.me):3001/admin"
echo ""
echo "📋 Commandes utiles :"
echo "   pm2 logs portfolio-admin  - Voir les logs"
echo "   pm2 restart portfolio-admin - Redémarrer"
echo "   pm2 stop portfolio-admin  - Arrêter"
echo ""
