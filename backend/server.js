const pool = require("./db");

pool.query("SELECT NOW()")
  .then(result => console.log(result.rows))
  .catch(err => console.error(err));