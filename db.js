// db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

module.exports = db;


// ¡ELIMINA O COMENTA ESTA PRUEBA MANUAL!
// db.getConnection()
//   .then(conn => {
//     console.log('Conexión a la base de datos exitosa');
//     conn.release();
//   })
//   .catch(err => {
//     console.error('Error de conexión a la base de datos:', err);
//   });



