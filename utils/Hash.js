var bcrypt = require('bcryptjs');
var salt = process.argv[2];
var string = process.argv[3];
process.stdout.write(bcrypt.hashSync(string, salt));
