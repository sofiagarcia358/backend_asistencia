// db.js
const mysql = require('mysql2/promise'); // Cambia a la versión con promesas

const db = mysql.createPool({
  host: 'bybunlq3uuiwfuk4i5pw-mysql.services.clever-cloud.com',       
  user: 'u1ibuucb8bzaldvd',   
  password: 'QlnC8xwlnFRipyceIIiv', 
  database: 'bybunlq3uuiwfuk4i5pw',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificación de conexión
db.getConnection()
  .then(conn => {
    console.log('Conexión a la base de datos exitosa');
    conn.release();
  })
  .catch(err => {
    console.error('Error de conexión a la base de datos:', err);
  });

module.exports = db;

