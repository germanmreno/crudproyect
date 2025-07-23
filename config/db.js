// src/config/db.js
// ------------------------------------------
// 1️⃣  Importamos la librería Mongoose.
//     Nos permite conectarnos a MongoDB y gestionar modelos/esquemas.
import mongoose from 'mongoose';

// 2️⃣  Extraemos la URI de conexión desde la variable de entorno.
//     De esta forma no hard-codeamos credenciales.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/miapp';

// 3️⃣  Opciones que le pasamos al driver nativo (útil para evitar
//     warnings y mejorar estabilidad en Mongoose 6+).
const options = {
  useNewUrlParser: true, // Fuerza la nueva cadena de conexión.
  useUnifiedTopology: true, // Usa el nuevo motor de descubrimiento de topologías.
};

// 4️⃣  Función asíncrona que realiza la conexión.
//     Se exporta para que la invoques desde server.js o index.js.
async function connectDB() {
  try {
    // 4.1  Intenta conectarse.
    await mongoose.connect(MONGO_URI, options);
    // 4.2  Feedback en consola para saber que se conectó.
    console.log(`✅ MongoDB conectado en ${mongoose.connection.host}`);
  } catch (error) {
    // 4.3  Si falla, log y terminamos el proceso para no arrancar la app.
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
}

// 5️⃣  Escucha el evento 'disconnected' para loguear desconexiones inesperadas.
mongoose.connection.on('disconnected', () =>
  console.warn('⚠️  MongoDB desconectado')
);

// 6️⃣  Escucha el evento 'error' para loguear errores de conexión en tiempo real.
mongoose.connection.on('error', (err) =>
  console.error('💥 Error en la conexión de MongoDB:', err)
);

export default connectDB;
