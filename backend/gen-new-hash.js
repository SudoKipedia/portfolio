const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Kunsharkting#0666', 12);
console.log(hash);
