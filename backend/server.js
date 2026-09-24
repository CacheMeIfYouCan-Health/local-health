const pool = require("./db");
const WebSocket = require("ws");g

pool.query("SELECT NOW()")
  .then(result => console.log(result.rows))
  .catch(err => console.error(err));