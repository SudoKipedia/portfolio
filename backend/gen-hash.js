const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 12);
console.log('NEW_HASH=' + hash);
console.log('Verify:', bcrypt.compareSync('admin123', hash));
