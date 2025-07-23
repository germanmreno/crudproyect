// Importa Mongoose para definir el esquema y el modelo.
import mongoose from 'mongoose';

// Define el esquema para la colección de Reseñas (Reviews).
const ReviewSchema = new mongoose.Schema(
  {
    // Define el campo 'movieId', que almacenará el ID de la película de la API externa.
    movieId: {
      type: String, // Se almacena como una cadena de texto.
      required: true, // Es un campo obligatorio para saber a qué película pertenece la reseña.
      index: true, // Indexamos para búsquedas rápidas por película
    },
    // Define el campo 'user', que establece una relación con el modelo 'User'.
    user: {
      // El tipo de dato es un ObjectId, que es el formato de ID único de MongoDB.
      type: mongoose.Schema.Types.ObjectId,
      // 'ref: 'User'' le dice a Mongoose que este campo hace referencia a un documento en la colección 'User'.
      // Esto nos permitirá "popular" la reseña con la información completa del usuario más adelante.
      ref: 'User',
      required: true, // Es obligatorio que cada reseña esté asociada a un usuario.
      index: true, // Indexamos para búsquedas rápidas por usuario
    },
    // Define el campo 'rating' (calificación).
    rating: {
      type: Number, // El tipo de dato es numérico.
      required: true, // Es un campo obligatorio.
      min: 1, // El valor mínimo permitido es 1.
      max: 5, // El valor máximo permitido es 5.
    },
    // Define el campo 'comment' (comentario).
    comment: {
      type: String, // El tipo de dato es una cadena de texto.
      required: true, // Es obligatorio que la reseña tenga un comentario.
      trim: true, // Elimina espacios en blanco al principio y al final.
    },
    // Campo para almacenar los likes
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Campo para contar los likes (para búsquedas y ordenamiento eficiente)
    likesCount: {
      type: Number,
      default: 0,
      index: true, // Indexamos para ordenar por popularidad
    },
    // Campo para indicar si la reseña está visible
    isVisible: {
      type: Boolean,
      default: true,
      index: true, // Indexamos para filtrar reseñas ocultas
    },
  },
  {
    // Opciones del esquema: 'timestamps: true' añade automáticamente los campos createdAt y updatedAt.
    timestamps: true,
  }
);

// Añade un índice compuesto único para asegurar que un usuario solo pueda tener una reseña por película
ReviewSchema.index({ user: 1, movieId: 1 }, { unique: true });

// Índice para búsquedas por fecha
ReviewSchema.index({ createdAt: -1 });

// Método para dar/quitar like
ReviewSchema.methods.toggleLike = async function (userId) {
  const userIdStr = userId.toString();
  const hasLiked = this.likes.some((id) => id.toString() === userIdStr);

  if (hasLiked) {
    this.likes = this.likes.filter((id) => id.toString() !== userIdStr);
    this.likesCount--;
  } else {
    this.likes.push(userId);
    this.likesCount++;
  }

  return this.save();
};

const Review = mongoose.model('Review', ReviewSchema);

// Crea y exporta el modelo 'Review' a partir del esquema definido.
// Este modelo nos permitirá interactuar con la colección 'reviews' en la base de datos.
export default Review;
