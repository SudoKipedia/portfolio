const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;

// Middleware
app.use(cors({
    origin: true, // Autorise toutes les origines pour le développement
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../admin')));
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
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_changez_moi';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Middleware d'authentification
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
}

// Route de login
app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Mot de passe requis' });
    }

    try {
        const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, expiresIn: 86400 });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifier le token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

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
// ROUTES API ADMIN (protégées)
// ===================================

// Stats - Update
app.put('/api/admin/stats', authenticateToken, (req, res) => {
    try {
        writeJsonFile('stats.json', req.body);
        res.json({ success: true, message: 'Stats mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Formations - Update
app.put('/api/admin/formations', authenticateToken, (req, res) => {
    try {
        writeJsonFile('formations.json', req.body);
        res.json({ success: true, message: 'Formations mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Skills - Update
app.put('/api/admin/skills', authenticateToken, (req, res) => {
    try {
        writeJsonFile('skills.json', req.body);
        res.json({ success: true, message: 'Compétences mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Projects - Update
app.put('/api/admin/projects', authenticateToken, (req, res) => {
    try {
        writeJsonFile('projects.json', req.body);
        res.json({ success: true, message: 'Projets mis à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Recommendations - Update
app.put('/api/admin/recommendations', authenticateToken, (req, res) => {
    try {
        writeJsonFile('recommendations.json', req.body);
        res.json({ success: true, message: 'Recommandations mises à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Documents - Update
app.put('/api/admin/documents', authenticateToken, (req, res) => {
    try {
        writeJsonFile('documents.json', req.body);
        res.json({ success: true, message: 'Documents mis à jour' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Upload de fichiers (PDF, images) avec compression automatique
app.post('/api/admin/upload', authenticateToken, upload.single('file'), async (req, res) => {
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
const PORTFOLIO_ROOT = path.join(__dirname, '..');
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

// Endpoint pour publier (export + git push)
app.post('/api/publish', authenticateToken, async (req, res) => {
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
    res.sendFile(path.join(__dirname, '../admin/index.html'));
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
