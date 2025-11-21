require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de multer pour gérer les fichiers en mémoire
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 8 * 1024 * 1024, // 8MB max par fichier
        files: 5 // Maximum 5 fichiers
    },
    fileFilter: (req, file, cb) => {
        // Types MIME autorisés
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Système de limitation par IP (10 minutes entre chaque message)
const ipLastMessage = new Map();
const RATE_LIMIT_MINUTES = 0; // Désactivé temporairement

function checkRateLimit(ip) {
    const now = Date.now();
    const lastMessageTime = ipLastMessage.get(ip);
    
    if (lastMessageTime) {
        const timeSinceLastMessage = now - lastMessageTime;
        const minutesSinceLastMessage = timeSinceLastMessage / (1000 * 60);
        
        if (minutesSinceLastMessage < RATE_LIMIT_MINUTES) {
            const remainingMinutes = Math.ceil(RATE_LIMIT_MINUTES - minutesSinceLastMessage);
            return { allowed: false, remainingMinutes };
        }
    }
    
    ipLastMessage.set(ip, now);
    return { allowed: true };
}

// Initialiser le bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot Discord connecté : ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Route pour recevoir les messages du formulaire
app.post('/api/contact', upload.array('attachments', 5), async (req, res) => {
    console.log('📨 Requête reçue sur /api/contact');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);
    
    // Récupérer l'IP du client
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log('IP:', clientIp);
    
    // Vérifier le rate limit
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
        console.log(`❌ Rate limit dépassé pour ${clientIp}`);
        return res.status(429).json({ 
            success: false, 
            error: `Veuillez attendre ${rateLimitCheck.remainingMinutes} minute(s) avant d'envoyer un nouveau message` 
        });
    }
    
    try {
        const { name, email, message } = req.body;

        // Validation des données
        if (!name || !email || !message) {
            console.log('❌ Données manquantes');
            return res.status(400).json({ 
                success: false, 
                error: 'Tous les champs sont requis' 
            });
        }

        console.log('✅ Données validées, création de l\'embed...');

        // Créer un embed Discord
        const embed = new EmbedBuilder()
            .setColor('#EF4444')
            .setTitle('📬 Nouveau message du Portfolio')
            .addFields(
                { name: '👤 Nom', value: name, inline: true },
                { name: '📧 Email', value: email, inline: true },
                { name: '💬 Message', value: message }
            )
            .setTimestamp()
            .setFooter({ text: 'Portfolio Contact Form' });

        // Ajouter info sur les pièces jointes si présentes
        if (req.files && req.files.length > 0) {
            const filesList = req.files.map(f => `📎 ${f.originalname} (${(f.size / 1024).toFixed(1)} KB)`).join('\n');
            embed.addFields({ name: '📁 Pièces jointes', value: filesList });
        }

        console.log('📤 Envoi du MP Discord...');
        
        // Envoyer le MP avec les fichiers joints
        const user = await client.users.fetch(process.env.DISCORD_USER_ID);
        
        const messageOptions = { embeds: [embed] };
        
        // Ajouter les fichiers joints si présents
        if (req.files && req.files.length > 0) {
            messageOptions.files = req.files.map(file => 
                new AttachmentBuilder(file.buffer, { name: file.originalname })
            );
        }
        
        await user.send(messageOptions);

        console.log('✅ MP envoyé avec succès !');

        res.json({ 
            success: true, 
            message: 'Message envoyé avec succès' 
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur lors de l\'envoi du message' 
        });
    }
});

// Route de test
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        botReady: client.isReady() 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
