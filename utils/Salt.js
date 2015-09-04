var bcrypt = require('bcryptjs');
var arg = process.argv[2];
process.stdout.write(bcrypt.genSaltSync());