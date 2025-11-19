require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Système de limitation par IP (10 minutes entre chaque message)
const ipLastMessage = new Map();
const RATE_LIMIT_MINUTES = 10;

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
app.post('/api/contact', async (req, res) => {
    console.log('📨 Requête reçue sur /api/contact');
    console.log('Body:', req.body);
    
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

        console.log('📤 Envoi du MP Discord...');
        
        // Envoyer le MP
        const user = await client.users.fetch(process.env.DISCORD_USER_ID);
        await user.send({ embeds: [embed] });

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
