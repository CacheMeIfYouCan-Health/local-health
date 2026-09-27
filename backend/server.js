const pool = require("./lib/db");
const WebSocket = require("ws");

pool.query("SELECT NOW()")
  .then(result => console.log(result.rows))
  .catch(err => console.error(err));
