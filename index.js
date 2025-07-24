import moviesRouter from './routes/movies.js';
import authRouter from './routes/auth.js';
import reviewsRouter from './routes/reviews.js';

// Importa el framework Express para crear y gestionar el servidor.
import express from 'express';
// Importa la librería CORS para permitir peticiones desde diferentes dominios.
import cors from 'cors';
// Importa la configuración de la base de datos que creamos previamente.
import connectDB from './config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el nombre del archivo y el directorio actual (para ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga las variables de entorno desde el archivo .env para que estén disponibles en process.env.
dotenv.config();

// Llama a la función para establecer la conexión con la base de datos MongoDB.
await connectDB();

// Crea una instancia de la aplicación Express.
const app = express();

// Habilita el middleware de CORS (Cross-Origin Resource Sharing).
// Esto es crucial para permitir que nuestra aplicación de React (que se servirá desde un puerto/dominio diferente)
// pueda hacer peticiones a esta API.

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));

// Habilita el middleware de Express para parsear (interpretar) el cuerpo de las peticiones entrantes en formato JSON.
// Sin esto, no podríamos leer los datos enviados en el cuerpo de las peticiones POST o PUT (req.body).
app.use(express.json());

// --- Definición de Rutas ---
// Le dice a la aplicación de Express que use el enrutador de autenticación para cualquier petición
// que comience con '/api/auth'. Por ejemplo, una petición a /api/auth/register será manejada
// por el enrutador que definimos en './routes/auth'.
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/movies', moviesRouter);
app.use('/api/auth', authRouter);
app.use('/api/reviews', reviewsRouter);

// Servir archivos estáticos desde la carpeta dist
app.use(express.static(path.join(__dirname, 'dist')));

// Manejar la ruta de React, devolver todas las peticiones a la aplicación React
app.all('/{*any}', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'dist'));
});
// Define el puerto en el que se ejecutará el servidor.
const PORT = process.env.PORT || 5000;

// Inicia el servidor y lo pone a la escucha de peticiones en el puerto especificado.
app.listen(PORT, () => {
  // Imprime un mensaje en la consola para confirmar que el servidor está corriendo.
  console.log(`El servidor está corriendo en el puerto ${PORT}`);
});
