const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./db'); // Tu conexión a MySQL
const app = express();
const codigos = {}; // Almacena los códigos enviados por correo

// Middleware
app.use(cors({ origin: 'http://127.0.0.1:5501' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Ruta principal

app.get('/', (req, res) => {
res.send('¡Hola desde mi backend en Express!');

});

// Ruta de login

app.post('/login', async (req, res) => {
const { correo, password } = req.body;
console.log('Intento de login con:', correo, password); // <--- AGREGA ESTO

try {

const [usuarios] = await db.query(
'SELECT * FROM usuarios WHERE correo = ? AND contraseña = ?',
[correo.trim(), password.trim()]

);

console.log('Resultado usuarios:', usuarios); // <--- Y ESTO

if (usuarios.length > 0) {

  return res.json({
    rol: 'profesor',
    id: usuarios[0].id,
    nombre: usuarios[0].nombre,
    correo: usuarios[0].correo  // <--- AGREGA ESTA LÍNEA
  });  

}

const [coordinadores] = await db.query(
'SELECT * FROM coordinador WHERE correo = ? AND contraseña = ?',
[correo.trim(), password.trim()]

);

if (coordinadores.length > 0) {
return res.json({
rol: 'coordinador',
id: coordinadores[0].id,
nombre: coordinadores[0].nombre
});

}

return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
} catch (error) {
console.error('Error en login:', error);
return res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
}

});

// Enviar código por correo

app.post('/enviar-codigo', async (req, res) => {

const { correo } = req.body;

const codigo = Math.floor(100000 + Math.random() * 900000).toString();

codigos[correo] = codigo;
let transporter = nodemailer.createTransport({
service: 'gmail',
auth: {
user: 'sofiadaligarciaper28@gmail.com',
pass: 'xtvrlmkkuibwhylj' // Usa una contraseña de aplicación

}

});

let mailOptions = {
from: 'sofiadaligarciaper28@gmail.com',
to: correo,
subject: 'Código de recuperación',
text: `Tu código de recuperación es: ${codigo}`

};

try {

await transporter.sendMail(mailOptions);
res.json({ success: true, mensaje: 'Código enviado correctamente' });
} catch (error) {
console.error(error);
res.status(500).json({ error: 'Error al enviar el correo' });
}

});

// Verificar código

app.post('/verificar-codigo', (req, res) => {
const { correo, codigo } = req.body;
if (codigos[correo] === codigo) {
res.json({ valido: true });
} else {
res.json({ valido: false });
}

});

// Cambiar contraseña en usuarios o coordinador

app.post('/cambiar-contrasena', (req, res) => {

const { correo, nuevaContrasena } = req.body;

const sqlUsuarios = 'UPDATE usuarios SET contraseña = ? WHERE correo = ?';
db.query(sqlUsuarios, [nuevaContrasena, correo], (err, result) => {
if (err) return res.status(500).json({ error: 'Error al actualizar en usuarios' });
if (result.affectedRows > 0) {
delete codigos[correo];
return res.json({ success: true, mensaje: 'Contraseña actualizada en usuarios' });
}
const sqlCoordinador = 'UPDATE coordinador SET contraseña = ? WHERE correo = ?';
db.query(sqlCoordinador, [nuevaContrasena, correo], (err2, result2) => {
if (err2) return res.status(500).json({ error: 'Error al actualizar en coordinador' });
if (result2.affectedRows > 0) {
delete codigos[correo];
return res.json({ success: true, mensaje: 'Contraseña actualizada en coordinador' });
}
return res.status(404).json({ error: 'Correo no encontrado en ninguna tabla' });
});
});

});
app.post('/agregar-profesor', async (req, res) => {
const { nombre, contrasena, correo, nivel, grado } = req.body;

try {

// 1. Obtener el nivel_id
const [niveles] = await db.query('SELECT id FROM nivel WHERE nivel = ?', [nivel]);
if (niveles.length === 0) {
return res.status(400).json({ error: 'Nivel no encontrado' });

}

const nivel_id = niveles[0].id;

// 2. Obtener el grado_id
const [grados] = await db.query('SELECT id FROM grados WHERE grado = ? AND nivel_id = ?', [grado, nivel_id]);
if (grados.length === 0) {
return res.status(400).json({ error: 'Grado no encontrado para este nivel' });
}
const grado_id = grados[0].id;
// 3. Hash de la contraseña (opcional pero recomendado)
// const hashedPassword = await bcrypt.hash(contrasena, 10);
// 4. Insertar el profesor
const [result] = await db.query(
'INSERT INTO usuarios (nombre, correo, contraseña, nivel_id, grado_id, tipo_usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
[nombre, correo, contrasena, nivel_id, grado_id, 1] // 1 = Profesor
);
if (result.affectedRows === 1) {
return res.status(200).json({ mensaje: 'Profesor agregado correctamente' });
} else {
return res.status(500).json({ error: 'No se pudo agregar el profesor' });
}
} catch (error) {
console.error('Error al agregar profesor:', error);
if (error.code === 'ER_DUP_ENTRY') {
return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
}
return res.status(500).json({
error: 'Error al agregar profesor',
detalle: error.message
});
}
});
app.post('/obtenerGradosPorProfesorYNivel', async (req, res) => {
  const { correo, nivel } = req.body;

  try {
      const [rows] = await conexion.query(`
          SELECT grado.grado
          FROM usuarios
          JOIN grado ON usuarios.grado_id = grado.id
          JOIN nivel ON grado.nivel_id = nivel.id
          WHERE usuario.correo = ? AND nivel.nombre = ?
      `, [correo, nivel]);

      res.json({ grados: rows });
  } catch (error) {
      console.error('Error al obtener grados:', error);
      res.status(500).json({ mensaje: 'Error al obtener grados' });
  }
});

app.post('/obtener_alumnos', async (req, res) => {
  const { grado, nivel } = req.body;

  try {
      const [alumnos] = await db.query(`
          SELECT nombre FROM alumnos
          JOIN grados ON alumnos.grado_id = grados.id
          JOIN nivel ON grados.nivel_id = nivel.id
          WHERE grados.grado = ? AND nivel.nombre = ?
      `, [grado, nivel]);

      res.json({ alumnos });
  } catch (error) {
      console.error('Error al obtener alumnos:', error);
      res.status(500).json({ mensaje: 'Error al obtener alumnos' });
  }
});



// Iniciar servidor

const PORT = 3000;

app.listen(PORT, () => {

console.log(`Servidor escuchando en http://localhost:${PORT}`);

});
