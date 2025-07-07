const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./db'); // Tu conexión a MySQL
const app = express();
const codigos = {}; // Almacena los códigos enviados por correo

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5501', 'https://asistencia-examen.onrender.com']  // sin la "h" extra ni la barra al final
}));


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
// Ruta: Obtener grados del profesor según su correo
app.post('/obtenerGradosProfesor', async (req, res) => {
  const { correo } = req.body;

  try {
    // Paso 1: Buscar el nivel_id del profesor
    const [usuarios] = await db.query(`
      SELECT nivel_id FROM usuarios WHERE correo = ?
    `, [correo]);

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: 'Profesor no encontrado' });
    }

    const nivelId = usuarios[0].nivel_id;

    // Paso 2: Obtener el nombre del nivel
    const [niveles] = await db.query(`
      SELECT nivel FROM nivel WHERE id = ?
    `, [nivelId]);

    const nombreNivel = niveles.length > 0 ? niveles[0].nivel : 'Desconocido';

    // Paso 3: Obtener los grados asociados a ese nivel
    const [grados] = await db.query(`
      SELECT id,grado FROM grados WHERE nivel_id = ?
    `, [nivelId]);

    // ✅ Esto es lo que necesitas:
    res.json({ nivel: nombreNivel, grados });
  } catch (error) {
    console.error('Error al obtener grados del profesor:', error);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
});
// Ruta para obtener alumnos por grado_id


app.post('/obtenerAlumnosPorGrado', async (req, res) => {
  const { grado_id } = req.body;

  if (!grado_id) {
    return res.status(400).json({ error: 'grado_id es requerido' });
  }

  try {
    const [alumnos] = await db.query(
      `SELECT id, nombre, correo FROM alumnos WHERE grado_id = ?`,
      [grado_id]
    );

    console.log('Alumnos obtenidos:', alumnos);

    res.json({ alumnos });
  } catch (error) {
    console.error('Error al obtener alumnos por grado:', error);
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

app.post('/agregarAlumno', async (req, res) => {
  const { nombre, correo, grado_id, usuario_id } = req.body;

  try {
    const [resultado] = await db.query(
      'INSERT INTO alumnos (nombre, correo, grado_id, usuario_id) VALUES (?, ?, ?, ?)',
      [nombre, correo, grado_id, usuario_id]
    );

    res.json({ ok: true, id: resultado.insertId });
  } catch (error) {
    console.error('Error al agregar alumno:', error.message);
    res.status(500).json({ ok: false, error: 'Error al guardar en la base de datos' });
  }
});

app.post('/guardarAsistencias', async (req, res) => {
  const asistencias = req.body.asistencias;

  try {
    for (const asistencia of asistencias) {
      // 1) Buscamos el último uniforme
      const [rows] = await db.query(
        `SELECT id 
         FROM uniforme 
         WHERE alumnos_id = ? 
         ORDER BY fecha DESC 
         LIMIT 1`,
        [asistencia.alumnos_id]
      );
      const uniformeId = rows.length ? rows[0].id : null;

      // 2) Insertamos en asistencia usando **db**
      await db.query(
        `INSERT INTO asistencia 
           (fecha, estado, alumnos_id, grados_id, uniforme_id, usuarios_id)
         VALUES (NOW(), ?, ?, ?, ?, ?)`,
        [
          asistencia.estado,
          asistencia.alumnos_id,
          asistencia.grados_id,
          uniformeId,
          asistencia.usuarios_id  // <- este campo debe venir desde el frontend
        ]
      );
      console.log('Registrando asistencia:', asistencia);

      
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error al guardar asistencias:', error);
    res.status(500).json({ ok: false, error: 'Error al guardar asistencias' });
  }
});



app.post('/guardarUniforme', async (req, res) => {
  const {
    polo,
    pantalon,
    cabello,
    sueter_sudadera,
    calsetines,
    zapatos,
    observaciones,
    alumnos_id
  } = req.body;

  const fecha = new Date();

  try {
    const [result] = await db.query(
      `INSERT INTO uniforme 
        (polo, pantalon, cabello, sueter_sudadera, calsetines, zapatos, observaciones, fecha, alumnos_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [polo, pantalon, cabello, sueter_sudadera, calsetines, zapatos, observaciones, fecha, alumnos_id]
    );

    res.json({ ok: true, uniforme_id: result.insertId });
  } catch (error) {
    console.error('Error al guardar uniforme:', error);
    res.status(500).json({ error: 'No se pudo guardar el uniforme' });
  }
});


app.post('/enviarCorreoAlumno', async (req, res) => {
  const { para, asunto, mensaje } = req.body;

  if (!para || !asunto || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan datos para enviar el correo' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sofiadaligarciaper28@gmail.com',
      pass: 'xtvrlmkkuibwhylj' // contraseña de aplicación (ya lo tienes bien configurado)
    }
  });

  const mailOptions = {
    from: 'sofiadaligarciaper28@gmail.com',
    to: para,
    subject: asunto,
    text: mensaje
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error al enviar correo al alumno:', error);
    res.status(500).json({ ok: false, error: 'Error al enviar correo al alumno' });
  }
});

app.post('/enviarCorreoTodos', async (req, res) => {
  const { destinatarios, asunto, mensaje } = req.body;

  if (!Array.isArray(destinatarios) || destinatarios.length === 0 || !asunto || !mensaje) {
    return res.status(400).json({ ok: false, error: 'Datos inválidos' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sofiadaligarciaper28@gmail.com',
        pass: 'xtvrlmkkuibwhylj'
      }
    });

    const mailOptions = {
      from: 'sofiadaligarciaper28@gmail.com',
      bcc: destinatarios, // Envío oculto a múltiples destinatarios
      subject: asunto,
      text: mensaje
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true });

  } catch (error) {
    console.error('❌ Error al enviar correos masivos:', error);
    res.status(500).json({ ok: false, error: 'Error al enviar correos masivos' });
  }
});


// En tu backend (por ejemplo, routes/alumnos.js)
app.post('/eliminarAlumno', async (req, res) => {
  const { alumno_id, correo, contrasena } = req.body;

  try {
    const [usuario] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

    if (usuario.length === 0) {
      return res.json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    if (usuario[0].contraseña !== contrasena) {
      return res.json({ ok: false, mensaje: 'Contraseña incorrecta' });
    }

    // Borra primero registros dependientes en asistencia
    await db.query('DELETE FROM asistencia WHERE alumnos_id = ?', [alumno_id]);

    // Borra registros dependientes en uniforme
    await db.query('DELETE FROM uniforme WHERE alumnos_id = ?', [alumno_id]);

    // Finalmente elimina al alumno
    await db.query('DELETE FROM alumnos WHERE id = ?', [alumno_id]);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar alumno:', err);
    res.json({ ok: false, mensaje: 'Error al eliminar alumno' });
  }
});



app.post('/eliminarProfesor', async (req, res) => {
  const { correoCoordinador, contrasena, idProfesor } = req.body;

  try {
      const [coordinador] = await db.query(
          'SELECT * FROM coordinador WHERE correo = ?', 
          [correoCoordinador]
      );

      if (coordinador.length === 0) {
          return res.status(404).json({ mensaje: 'Coordinador no encontrado' });
      }

      if (coordinador[0].contraseña !== contrasena) {
          return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
      }

      await db.query('DELETE FROM usuarios WHERE id = ?', [idProfesor]);
      res.json({ mensaje: 'Profesor eliminado exitosamente' });

  } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al eliminar profesor' });
  }
});

app.post('/profesoresPorNivel', async (req, res) => {
  const { nivel } = req.body;

  try {
    const [filas] = await db.execute(`
      SELECT 
        g.id AS grado_id,
        g.grado AS grado_nombre,
        u.id AS profesor_id,
        u.nombre AS profesor_nombre
      FROM grados g
      JOIN nivel n ON g.nivel_id = n.id
      LEFT JOIN usuarios u ON u.grado_id = g.id AND u.tipo_usuario_id = 1
      WHERE n.nivel = ?
    `, [nivel]);

    res.json(filas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener grados y profesores' });
  }
});



app.post('/obtenerGradosPorNivel', async (req, res) => {
  const { nivel } = req.body;

  try {
      const [grados] = await db.query(`
          SELECT g.id, g.grado 
          FROM grados g
          JOIN nivel n ON g.nivel_id = n.id
          WHERE n.nivel = ?
      `, [nivel]);

      res.json({ grados, nivel });
  } catch (error) {
      console.error('Error al obtener grados por nivel:', error);
      res.status(500).json({ mensaje: 'Error del servidor' });
  }
});

// Express: /proyeccionProfesor
app.post('/proyeccionProfesor', async (req, res) => {
  const { profesorId, gradoId, mes, anio } = req.body;

  if (!profesorId || !gradoId || !mes || !anio) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    // Traemos fechas únicas para evitar contar múltiples asistencias el mismo día
    const [asistencias] = await db.execute(`
      SELECT DISTINCT DATE(fecha) AS fecha
      FROM asistencia
      WHERE usuarios_id = ? AND grados_id = ?
        AND MONTH(fecha) = ? AND YEAR(fecha) = ?
    `, [profesorId, gradoId, mes, anio]);

    const conteoSemanas = [0, 0, 0, 0, 0];

    asistencias.forEach(({ fecha }) => {
      const dia = new Date(fecha).getDate();
      const semana = Math.floor((dia - 1) / 7); // 0 a 4
      if (semana >= 0 && semana < 5) {
        conteoSemanas[semana]++;
      }
    });

    const resultado = conteoSemanas.map(dias => {
      if (dias === 0) {
        // Sin asistencia: estado y porcentaje en blanco para que aparezca vacío en frontend
        return { estado: '', porcentaje: 0 };
      }
      const porcentaje = dias * 20;
      let estado = 'rojo';
      if (porcentaje === 100) estado = 'verde';
      else if (porcentaje >= 80) estado = 'amarillo';
      return { estado, porcentaje };
    });
    

    res.json({ ok: true, datos: resultado });
  } catch (err) {
    console.error('Error en proyección profesor:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

app.post('/asistenciaPorGradoMes', async (req, res) => {
  const { gradoId, mes, anio } = req.body;

  if (!gradoId || !mes || !anio) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    const [resultados] = await db.execute(`
      SELECT DATE(fecha) AS fecha,
             SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) AS llegaron,
             SUM(CASE WHEN estado = 2 THEN 1 ELSE 0 END) AS tarde,
             SUM(CASE WHEN estado = 0 THEN 1 ELSE 0 END) AS faltaron
      FROM asistencia
      WHERE grados_id = ? AND MONTH(fecha) = ? AND YEAR(fecha) = ?
      GROUP BY DATE(fecha)
    `, [gradoId, mes, anio]);

    res.json(resultados);
  } catch (err) {
    console.error('Error en asistenciaPorGradoMes:', err);
    res.status(500).json({ ok: false, error: 'Error al obtener asistencia por mes' });
  }
});

app.post('/asistenciaResumenCalendario', async (req, res) => {
  const { alumnoId, mes, anio } = req.body;

  if (!alumnoId || !mes || !anio) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    const [resultados] = await db.execute(`
      SELECT DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha,
             CASE 
               WHEN a.estado IN ('Vino', '1', 1) THEN 'verde'
               WHEN a.estado IN ('Tarde', '2', 2) THEN 'amarillo'
               WHEN a.estado IN ('NO vino', '0', 0, '3', 3) THEN 'rojo'
               ELSE 'gris'
             END AS color
      FROM asistencia a
      INNER JOIN (
          SELECT DATE(fecha) AS fecha_max, MAX(id) AS id_max
          FROM asistencia
          WHERE alumnos_id = ? AND MONTH(fecha) = ? AND YEAR(fecha) = ?
          GROUP BY DATE(fecha)
      ) ult
      ON DATE(a.fecha) = ult.fecha_max AND a.id = ult.id_max
      WHERE a.alumnos_id = ?
    `, [alumnoId, mes, anio, alumnoId]);

    const colores = {};
    resultados.forEach(({ fecha, color }) => {
      colores[fecha] = color;
    });

    res.json({ ok: true, colores });
  } catch (err) {
    console.error('Error en asistenciaResumenCalendario:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

app.post('/asistenciaPorcentajesSemana', async (req, res) => {
  const { grado, nivel } = req.body;

  if (!grado || !nivel) {
    return res.status(400).json({ ok: false, error: 'Faltan datos' });
  }

  try {
    const [alumnos] = await db.execute(`
      SELECT a.id, a.nombre
      FROM alumnos a
      JOIN grados g ON a.grado_id = g.id
      JOIN nivel n ON g.nivel_id = n.id
      WHERE g.grado = ? AND n.nivel = ?
    `, [grado, nivel]);

    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // lunes de esta semana
    const viernes = new Date(lunes.getTime() + 4 * 86400000); // viernes

    const [asistencias] = await db.execute(`
      SELECT alumnos_id, estado, fecha
      FROM asistencia
      WHERE fecha BETWEEN ? AND ?
    `, [lunes.toISOString().split('T')[0], viernes.toISOString().split('T')[0]]);

    const resumen = alumnos.map(alumno => {
      let puntos = 0;

      asistencias
        .filter(a => a.alumnos_id === alumno.id)
        .forEach(a => {
          const estado = a.estado.toString().toLowerCase();
          if (estado === '1' || estado === 'vino') puntos += 20;
          else if (estado === '2' || estado === 'tarde') puntos += 10;
          // '0' o 'no vino' no suman puntos
        });

      return {
        nombre: alumno.nombre,
        porcentaje: `${puntos}%`
      };
    });

    res.json({ ok: true, resumen });
  } catch (err) {
    console.error('❌ Error en porcentaje semanal:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});


// ✅ Ruta para obtener niveles
app.get('/niveles', async (req, res) => {
  try {
    const [niveles] = await db.query('SELECT * FROM nivel');
    res.json({ ok: true, niveles });
  } catch (error) {
    console.error('Error al obtener niveles:', error);
    res.status(500).json({ ok: false, error: 'Error al obtener niveles' });
  }
});







// Iniciar servidor

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

