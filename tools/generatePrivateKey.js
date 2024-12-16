// This generates a private key for generating the JWT
// Run as: $> node ./tools/generatePrivateKey
// Copy console output to the authentication middleware in server folder

const crypto = require('crypto');

const secretKey = crypto.randomBytes(64).toString('hex');
console.log(secretKey);
