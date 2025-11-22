# Backend Portfolio - Contact Discord

Backend Node.js pour recevoir les messages du formulaire de contact et les envoyer en MP Discord.

## Installation

1. Installer les dépendances :

```bash
npm install
```

2. Créer un fichier `.env` basé sur `.env.example` :

```bash
cp .env.example .env
```

3. Remplir le fichier `.env` avec :
    - `DISCORD_BOT_TOKEN` : Le token de ton bot Discord
    - `DISCORD_USER_ID` : Ton User ID Discord (déjà rempli : 551440905261940736)
    - `PORT` : Le port sur lequel le serveur va tourner (par défaut 3000)

## Lancement

### En développement local :

```bash
npm start
```

### Sur Oracle Cloud :

1. Transférer les fichiers sur ton serveur
2. Installer Node.js si nécessaire :

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Installer les dépendances :

```bash
cd /chemin/vers/backend
npm install
```

4. Créer le fichier `.env` avec tes variables

5. Lancer avec PM2 (recommandé) :

```bash
sudo npm install -g pm2
pm2 start server.js --name portfolio-backend
pm2 save
pm2 startup
```

6. Ouvrir le port dans le firewall :

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Configuration du bot Discord

1. Va sur https://discord.com/developers/applications
2. Crée une nouvelle application ou utilise celle existante
3. Va dans "Bot" → Active "MESSAGE CONTENT INTENT"
4. Copie le token et mets-le dans `.env`

## Test

Une fois le serveur lancé, teste avec :

```bash
curl http://localhost:3000/api/health
```

Devrait retourner : `{"status":"ok","botReady":true}`
