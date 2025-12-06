const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 12);
console.log(hash);
