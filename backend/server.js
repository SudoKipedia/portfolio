const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const crypto = require('crypto');

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Fonction de log sécurisée (pas de données sensibles en prod)
function secureLog(message, ...args) {
    if (!IS_PRODUCTION) {
        console.log(message, ...args);
    }
}

// ===================================
// PROTECTION CSRF
// ===================================
const csrfTokens = new Map();
const CSRF_TOKEN_EXPIRY = 4 * 60 * 60 * 1000; // 4 heures

function generateCsrfToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, { sessionId, createdAt: Date.now() });
    
    // Nettoyage des tokens expirés
    for (const [t, data] of csrfTokens.entries()) {
        if (Date.now() - data.createdAt > CSRF_TOKEN_EXPIRY) {
            csrfTokens.delete(t);
        }
    }
    
    return token;
}

function validateCsrfToken(token, sessionId) {
    const data = csrfTokens.get(token);
    if (!data) return false;
    if (data.sessionId !== sessionId) return false;
    if (Date.now() - data.createdAt > CSRF_TOKEN_EXPIRY) {
        csrfTokens.delete(token);
        return false;
    }
    return true;
}

// Middleware CSRF pour les requêtes de modification
function csrfProtection(req, res, next) {
    // Skip pour les requêtes GET et le login initial
    if (req.method === 'GET' || req.path === '/api/auth/login') {
        return next();
    }
    
    const csrfToken = req.headers['x-csrf-token'];
    const sessionId = req.user?.username || req.ip;
    
    if (!csrfToken || !validateCsrfToken(csrfToken, sessionId)) {
        return res.status(403).json({ error: 'Token CSRF invalide ou expiré' });
    }
    
    next();
}

// ===================================
// SÉCURITÉ
// ===================================

// Helmet - Headers de sécurité avec CSP
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false, // Désactiver les defaults de Helmet
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"], // Autoriser onclick, onchange, etc.
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            frameAncestors: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
}));

// Rate limiting global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requêtes par IP
    message: { error: 'Trop de requêtes, réessayez plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting strict pour le login (anti brute-force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 tentatives de login
    message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Ne compte pas les succès
});

// Rate limiting pour les actions sensibles (publish, upload)
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Max 10 actions par minute
    message: { error: 'Trop d\'actions, patientez un moment' },
});

// Appliquer le rate limiting
app.use('/api/', globalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/publish', sensitiveLimiter);
app.use('/api/upload', sensitiveLimiter);

// Stockage des tentatives échouées (anti brute-force avancé)
const failedAttempts = new Map();
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes de blocage
const MAX_FAILED_ATTEMPTS = 10; // Après 10 échecs

function checkBruteForce(ip) {
    const attempts = failedAttempts.get(ip);
    if (!attempts) return false;
    
    if (attempts.count >= MAX_FAILED_ATTEMPTS && Date.now() - attempts.lastAttempt < LOCKOUT_TIME) {
        return true; // IP bloquée
    }
    
    // Reset si le temps est passé
    if (Date.now() - attempts.lastAttempt >= LOCKOUT_TIME) {
        failedAttempts.delete(ip);
    }
    
    return false;
}

function recordFailedAttempt(ip) {
    const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    failedAttempts.set(ip, attempts);
    // Log sécurisé - masquer partiellement l'IP en prod
    const maskedIP = IS_PRODUCTION ? ip.replace(/\d+$/, 'xxx') : ip;
    console.log(`⚠️ Tentative échouée depuis ${maskedIP} (${attempts.count}/${MAX_FAILED_ATTEMPTS})`);
}

function clearFailedAttempts(ip) {
    failedAttempts.delete(ip);
}

// CORS - Configuration sécurisée
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : [
        'http://localhost:3001', 
        'http://127.0.0.1:3001',
        'https://sudokipedia-portfolio.duckdns.org'
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Autoriser les requêtes sans origin (same-origin, curl, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        // Vérifier si l'origine est autorisée
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else if (!IS_PRODUCTION) {
            // En dev, tout autoriser
            callback(null, true);
        } else {
            callback(new Error('CORS non autorisé'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuration multer pour upload de fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// ===================================
// HELPERS
// ===================================
const DATA_DIR = path.join(__dirname, 'data');

function readJsonFile(filename) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

function writeJsonFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
}

// ===================================
// COMPRESSION D'IMAGES (Sharp)
// ===================================
const sharp = require('sharp');

async function compressAndConvertImage(inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'].includes(ext);
    
    if (!isImage) {
        return inputPath; // Pas une image, retourner le chemin original
    }
    
    try {
        const outputFilename = path.basename(inputPath, ext) + '.webp';
        const outputPath = path.join(path.dirname(inputPath), outputFilename);
        
        await sharp(inputPath)
            .resize(1920, 1080, { 
                fit: 'inside', 
                withoutEnlargement: true 
            })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        // Supprimer l'original
        fs.unlinkSync(inputPath);
        
        console.log(`📸 Image compressée: ${outputFilename}`);
        return outputPath;
    } catch (error) {
        console.error('Erreur compression image:', error);
        return inputPath; // Retourner l'original en cas d'erreur
    }
}

// ===================================
// AUTHENTIFICATION
// ===================================
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const VIEWER_PASSWORD_HASH = process.env.VIEWER_PASSWORD_HASH;

// Vérification des variables d'environnement critiques
if (!JWT_SECRET || JWT_SECRET === 'votre_secret_jwt_super_securise_changez_moi') {
    console.error('❌ ERREUR CRITIQUE: JWT_SECRET non configuré ou valeur par défaut !');
    console.error('   Modifiez le fichier .env avec un secret sécurisé.');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

if (!ADMIN_PASSWORD_HASH) {
    console.error('❌ ERREUR CRITIQUE: ADMIN_PASSWORD_HASH non configuré !');
    console.error('   Générez un hash avec: node -e "console.log(require(\'bcryptjs\').hashSync(\'votre_mot_de_passe\', 10))"');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

if (!VIEWER_PASSWORD_HASH) {
    console.warn('⚠️ VIEWER_PASSWORD_HASH non configuré - utilisateur Pomme désactivé');
}

// Log de configuration (sans détails sensibles)
if (!IS_PRODUCTION) {
    console.log('🔐 Auth config: Admin=' + (ADMIN_PASSWORD_HASH ? 'OK' : 'MISSING') + ', Viewer=' + (VIEWER_PASSWORD_HASH ? 'OK' : 'MISSING'));
}

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
            }
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
}

// Route de login sécurisée
app.post('/api/auth/login', async (req, res) => {
    console.log('📥 Tentative de login reçue');
    const clientIP = req.ip || req.connection.remoteAddress;
    const { username, password } = req.body;
    console.log(`📧 Username: ${username}, IP: ${clientIP}`);

    // Vérifier si l'IP est bloquée
    if (checkBruteForce(clientIP)) {
        console.log(`🚫 IP bloquée: ${clientIP}`);
        return res.status(429).json({ 
            error: 'Compte temporairement bloqué. Réessayez dans 30 minutes.' 
        });
    }

    if (!username || !password) {
        secureLog('❌ Username ou password manquant');
        return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    // Configuration des utilisateurs
    const USERS = {
        'Fraise': { passwordHash: ADMIN_PASSWORD_HASH, role: 'admin' },
        'Pomme': { passwordHash: VIEWER_PASSWORD_HASH, role: 'viewer' }
    };

    secureLog(`🔍 Recherche user: ${username}, trouvé: ${!!USERS[username]}`);
    const user = USERS[username];
    if (!user || !user.passwordHash) {
        secureLog(`❌ User non trouvé ou hash manquant`);
        recordFailedAttempt(clientIP);
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Délai artificiel pour ralentir les attaques (100-300ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    try {
        secureLog(`🔐 Comparaison bcrypt en cours...`);
        const isValid = await bcrypt.compare(password, user.passwordHash);
        secureLog(`🔐 Résultat bcrypt: ${isValid}`);
        
        if (!isValid) {
            recordFailedAttempt(clientIP);
            // Message générique pour ne pas révéler si le compte existe
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        // Connexion réussie - reset les tentatives
        clearFailedAttempts(clientIP);
        console.log(`✅ Connexion ${user.role} réussie depuis ${IS_PRODUCTION ? clientIP.replace(/\d+$/, 'xxx') : clientIP}`);

        // Token avec expiration courte (4h au lieu de 24h)
        const token = jwt.sign(
            { role: user.role, username: username, ip: clientIP }, 
            JWT_SECRET, 
            { expiresIn: '4h' }
        );
        
        // Générer un token CSRF pour cette session
        const csrfToken = generateCsrfToken(username);
        
        res.json({ token, role: user.role, expiresIn: 14400, csrfToken }); // 4 heures
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifier le token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Middleware pour vérifier le rôle admin (pour les actions de modification)
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Action réservée aux administrateurs' });
    }
    next();
}

// ===================================
// ROUTES API PUBLIQUES (lecture seule)
// ===================================

// Stats
app.get('/api/stats', (req, res) => {
    const data = readJsonFile('stats.json');
    res.json(data);
});

// Formations
app.get('/api/formations', (req, res) => {
    const data = readJsonFile('formations.json');
    res.json(data);
});

// Skills
app.get('/api/skills', (req, res) => {
    const data = readJsonFile('skills.json');
    res.json(data);
});

// Projects
app.get('/api/projects', (req, res) => {
    const data = readJsonFile('projects.json');
    res.json(data);
});

// Recommendations
app.get('/api/recommendations', (req, res) => {
    const data = readJsonFile('recommendations.json');
    res.json(data);
});

// Documents
app.get('/api/documents', (req, res) => {
    const data = readJsonFile('documents.json');
    res.json(data);
});

// ===================================
// ROUTES API ADMIN (protégées - admin seulement)
// ===================================

// Stats - Update
app.put('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('stats.json', req.body);
        res.json({ success: true, message: 'Stats mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Formations - Update
app.put('/api/admin/formations', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('formations.json', req.body);
        res.json({ success: true, message: 'Formations mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Skills - Update
app.put('/api/admin/skills', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('skills.json', req.body);
        res.json({ success: true, message: 'Compétences mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Projects - Update
app.put('/api/admin/projects', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('projects.json', req.body);
        res.json({ success: true, message: 'Projets mis à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Recommendations - Update
app.put('/api/admin/recommendations', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('recommendations.json', req.body);
        res.json({ success: true, message: 'Recommandations mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Documents - Update
app.put('/api/admin/documents', authenticateToken, requireAdmin, (req, res) => {
    try {
        writeJsonFile('documents.json', req.body);
        res.json({ success: true, message: 'Documents mis à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Upload de fichiers (PDF, images) avec compression automatique
app.post('/api/admin/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }
    
    try {
        // Compresser et convertir en WebP si c'est une image
        const processedPath = await compressAndConvertImage(req.file.path);
        const processedFilename = path.basename(processedPath);
        
        const fileUrl = `/uploads/${processedFilename}`;
        res.json({ 
            success: true, 
            url: fileUrl,
            filename: processedFilename,
            originalName: req.file.originalname,
            size: fs.statSync(processedPath).size
        });
    } catch (error) {
        console.error('Upload error:', error);
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    }
});

// ===================================
// PUBLICATION - Export des données et Git Push
// ===================================
// En production, utiliser la variable d'env PORTFOLIO_ROOT, sinon parent du backend
const PORTFOLIO_ROOT = process.env.PORTFOLIO_ROOT || path.join(__dirname, '..');
const STATIC_DATA_DIR = path.join(PORTFOLIO_ROOT, 'data');

// Copier les fichiers JSON vers le dossier data/ à la racine
function exportStaticData() {
    // Créer le dossier data/ s'il n'existe pas
    if (!fs.existsSync(STATIC_DATA_DIR)) {
        fs.mkdirSync(STATIC_DATA_DIR, { recursive: true });
    }
    
    // Liste des fichiers à copier
    const files = ['stats.json', 'formations.json', 'skills.json', 'projects.json', 'recommendations.json', 'documents.json'];
    
    files.forEach(file => {
        const src = path.join(DATA_DIR, file);
        const dest = path.join(STATIC_DATA_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
        }
    });
    
    return true;
}

// Exécuter une commande git
function runGitCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr });
            } else {
                resolve(stdout);
            }
        });
    });
}

// Endpoint pour publier (export + git push) - admin seulement
app.post('/api/publish', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const commitMessage = req.body.message || `Mise à jour du portfolio - ${new Date().toLocaleString('fr-FR')}`;
        
        // 1. Exporter les données statiques
        exportStaticData();
        console.log('✅ Données exportées vers /data');
        
        // 2. Git add
        await runGitCommand('git add -A', PORTFOLIO_ROOT);
        console.log('✅ Git add');
        
        // 3. Git commit
        try {
            await runGitCommand(`git commit -m "${commitMessage}"`, PORTFOLIO_ROOT);
            console.log('✅ Git commit');
        } catch (commitError) {
            // Si rien à commiter, ce n'est pas une erreur
            if (commitError.stderr && commitError.stderr.includes('nothing to commit')) {
                return res.json({ success: true, message: 'Aucune modification à publier' });
            }
            throw commitError;
        }
        
        // 4. Git push
        await runGitCommand('git push', PORTFOLIO_ROOT);
        console.log('✅ Git push');
        
        res.json({ success: true, message: 'Publication réussie !' });
    } catch (error) {
        console.error('Erreur publication:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la publication',
            error: error.stderr || error.message 
        });
    }
});

// ===================================
// ROUTE ADMIN PAGE
// ===================================
app.get('/admin', (req, res) => {
    res.redirect('/admin/login.html');
});

app.get('/admin/', (req, res) => {
    res.redirect('/admin/login.html');
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/login.html'));
});

// ===================================
// UTILITAIRE - Générer un hash de mot de passe
// ===================================
app.get('/api/utils/hash/:password', async (req, res) => {
    // Route temporaire pour générer un hash - À SUPPRIMER EN PRODUCTION
    const hash = await bcrypt.hash(req.params.password, 10);
    res.json({ hash });
});

// ===================================
// DÉMARRAGE
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Serveur admin démarré sur http://localhost:${PORT}`);
    console.log(`📁 Panel admin: http://localhost:${PORT}/admin`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
});
