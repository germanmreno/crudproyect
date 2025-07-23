// Importa Mongoose para definir esquemas y modelos.
import mongoose from 'mongoose';

// Define el esquema para la colección de Usuarios
const UserSchema = new mongoose.Schema(
  {
    // Define el campo 'username' (nombre de usuario)
    username: {
      type: String, // El tipo de dato es una cadena de texto
      required: true, // Este campo es obligatorio
      unique: true, // Cada nombre de usuario debe ser único en la colección
      trim: true, // Elimina espacios en blanco al principio y al final del valor
    },
    // Define el campo 'email'.
    email: {
      type: String, // El tipo de dato es una cadena de texto
      required: true, // Este campo es obligatorio
      unique: true, // Cada email debe ser único
      // Utiliza una expresión regular para validar que el formato del email sea correcto
      match: [
        /.+\@.+\..+/,
        'Por favor, introduce un correo electrónico válido',
      ],
    },
    // Define el campo 'password'.
    password: {
      type: String, // El tipo de dato es una cadena de texto
      required: true, // Este campo es obligatorio
    },
    avatar: {
      type: String,
      default: null,
    },
    preferences: {
      gridSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium',
      },
      sortBy: {
        type: String,
        enum: [
          'recent',
          'oldest',
          'rating-desc',
          'rating-asc',
          'title-asc',
          'title-desc',
        ],
        default: 'recent',
      },
    },
  },
  {
    // Opciones del esquema
    // 'timestamps: true' añade automáticamente dos campos a cada documento: createdAt y updatedAt
    timestamps: true,
  }
);

const User = mongoose.model('User', UserSchema);

// Crea y exporta el modelo 'User' a partir del esquema definido.
// Un modelo es una clase con la que construimos documentos. En este caso, un modelo 'User'
// nos permitirá crear, leer, actualizar y eliminar usuarios en la colección 'users' de MongoDB.
export default User;
