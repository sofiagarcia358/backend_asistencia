// db.js
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'bybunlq3uuiwfuk4i5pw-mysql.services.clever-cloud.com',
  user: 'u1ibuucb8bzaldvd',
  password: 'QlnC8xwlnFRipyceIIiv',
  database: 'bybunlq3uuiwfuk4i5pw',
  waitForConnections: true,
  connectionLimit: 5,  // igual al límite de tu plan
  queueLimit: 0
});

// ¡ELIMINA O COMENTA ESTA PRUEBA MANUAL!
// db.getConnection()
//   .then(conn => {
//     console.log('Conexión a la base de datos exitosa');
//     conn.release();
//   })
//   .catch(err => {
//     console.error('Error de conexión a la base de datos:', err);
//   });

module.exports = db;


