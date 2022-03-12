const credentials   = require('./.credentials');
const mysql         = require('mysql2');

module.exports = mysql.createConnection({
  database: credentials.database,
  host: 'localhost',
  multipleStatements: true, // this is a potential security risk
  password: credentials.password,
  user: credentials.user,
});