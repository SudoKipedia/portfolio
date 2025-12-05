# 🚀 Déploiement Oracle Cloud

## Prérequis

- Une VM Oracle Cloud (Ubuntu 22.04 recommandé)
- Accès SSH à la VM
- Un nom de domaine pointant vers l'IP de la VM (recommandé pour HTTPS)

## 🔐 Sécurité

Le serveur inclut les protections suivantes :
- ✅ **Rate limiting** : Protection contre les attaques DDoS
- ✅ **Anti brute-force** : Blocage après 10 tentatives échouées
- ✅ **Headers sécurisés** : Helmet.js (XSS, CSRF, etc.)
- ✅ **JWT sécurisé** : Expiration courte (4h)
- ✅ **CORS strict** : Origines autorisées uniquement
- ✅ **HTTPS** : Chiffrement SSL/TLS (avec le script setup-https.sh)

## Déploiement rapide

### 1. Se connecter à la VM
```bash
ssh -i ta_clé.key ubuntu@<IP_ORACLE>
```

### 2. Télécharger et exécuter le script
```bash
git clone https://github.com/SudoKipedia/portfolio.git
cd portfolio/deploy
chmod +x deploy-oracle.sh
./deploy-oracle.sh
```

### 3. Configurer le .env (IMPORTANT !)
```bash
nano ~/portfolio/backend/.env
```

**Génère des valeurs sécurisées :**
```bash
# Générer un JWT_SECRET sécurisé
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Générer le hash du mot de passe (remplace MOT_DE_PASSE)
node -e "console.log(require('bcryptjs').hashSync('MOT_DE_PASSE', 12))"
```

### 4. Configurer HTTPS (recommandé)
```bash
chmod +x setup-https.sh
./setup-https.sh
```

### 5. Redémarrer le serveur
```bash
pm2 restart portfolio-admin
```

## Ouvrir les ports sur Oracle Cloud

1. Va dans la console Oracle Cloud
2. **Networking** → **Virtual Cloud Networks**
3. Sélectionne ta VCN → **Security Lists**
4. **Add Ingress Rules** :

| Port | Description |
|------|-------------|
| 80 | HTTP (redirection vers HTTPS) |
| 443 | HTTPS |
| 22 | SSH |

⚠️ **Ne PAS ouvrir le port 3001** si tu utilises HTTPS avec Nginx !

## Commandes utiles

```bash
# Voir les logs
pm2 logs portfolio-admin

# Voir les logs Nginx
sudo tail -f /var/log/nginx/portfolio-admin.access.log

# Redémarrer
pm2 restart portfolio-admin

# Statut
pm2 status

# Renouveler le certificat SSL manuellement
sudo certbot renew
```

## Mettre à jour

```bash
cd ~/portfolio
git pull
cd backend
npm install
pm2 restart portfolio-admin
```

## Accès

| Mode | URL |
|------|-----|
| HTTP (dev) | `http://<IP_ORACLE>:3001/admin` |
| HTTPS (prod) | `https://ton-domaine.com/admin` |

## 🛡️ Bonnes pratiques

1. **Utilise TOUJOURS HTTPS** en production
2. **Change le JWT_SECRET** avec une vraie clé aléatoire
3. **Utilise un mot de passe fort** (12+ caractères, mixte)
4. **Mets à jour régulièrement** : `npm audit fix`
5. **Surveille les logs** pour détecter les attaques
