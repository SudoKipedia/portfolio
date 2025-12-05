/**
 * Script pour générer le hash du mot de passe admin
 * 
 * Utilisation:
 * 1. Exécutez: node setup-password.js votre_mot_de_passe
 * 2. Copiez le hash généré dans votre fichier .env
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
    console.log('❌ Usage: node setup-password.js <votre_mot_de_passe>');
    console.log('');
    console.log('Exemple: node setup-password.js MonSuperMotDePasse123!');
    process.exit(1);
}

const saltRounds = 10;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('');
console.log('✅ Hash généré avec succès !');
console.log('');
console.log('Copiez cette ligne dans votre fichier .env :');
console.log('');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log('');
console.log('Assurez-vous également d\'avoir défini JWT_SECRET dans votre .env');
console.log('Exemple: JWT_SECRET=une_cle_secrete_tres_longue_et_complexe_123');
console.log('');
