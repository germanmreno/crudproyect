import express from 'express';
import Review from '../models/Review.js'; // ES-module import
import authMiddleware from '../middleware/authMiddleware.js'; // JWT verifier (see below)
import User from '../models/User.js';
import axios from 'axios';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const router = express.Router();

// Obtener reseñas del usuario con ordenamiento
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const { sortBy = 'recent' } = req.query;
    let sortOptions = {};

    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'rating-desc':
        sortOptions = { rating: -1 };
        break;
      case 'rating-asc':
        sortOptions = { rating: 1 };
        break;
      case 'title-asc':
        sortOptions = { movieId: 1 };
        break;
      case 'title-desc':
        sortOptions = { movieId: -1 };
        break;
      default: // 'recent'
        sortOptions = { createdAt: -1 };
    }

    const reviews = await Review.find({ user: req.user.id })
      .select('movieId rating comment createdAt')
      .sort(sortOptions);

    const movieIds = [...new Set(reviews.map((r) => r.movieId))];

    res.json({
      status: 'success',
      message: `Se encontraron ${reviews.length} reseñas`,
      data: { reviews, movieIds },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener tus reseñas',
      error: err.message,
    });
  }
});

// Crear reseña
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;
    if (!movieId || !rating || !comment) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos incompletos',
        details: {
          movieId: !movieId ? 'ID de película requerido' : null,
          rating: !rating ? 'Calificación requerida' : null,
          comment: !comment ? 'Comentario requerido' : null,
        },
      });
    }

    // Verificar si ya existe una reseña para esta película
    const existingReview = await Review.findOne({
      user: req.user.id,
      movieId: movieId,
    });

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya has reseñado esta película',
        details: {
          movieId,
          existingReviewId: existingReview._id,
        },
      });
    }

    const review = await Review.create({
      movieId,
      rating,
      comment,
      user: req.user.id,
    });

    await review.populate('user', 'username');
    res.status(201).json({
      status: 'success',
      message: '¡Reseña creada exitosamente!',
      data: review,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear la reseña',
      error: err.message,
    });
  }
});

// Obtener reseñas de una película
router.get('/', async (req, res) => {
  try {
    const { movieId } = req.query;
    if (!movieId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de película requerido',
        details: { movieId: 'Este campo es obligatorio' },
      });
    }

    const reviews = await Review.find({ movieId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      message: `Se encontraron ${reviews.length} reseñas para esta película`,
      data: reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las reseñas',
      error: err.message,
    });
  }
});

// Borrar reseña
router.delete('/:movieId', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findOne({
      movieId: req.params.movieId,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Reseña no encontrada',
        details: {
          movieId: req.params.movieId,
          userId: req.user.id,
        },
      });
    }

    await review.deleteOne();
    res.json({
      status: 'success',
      message: '¡Reseña eliminada exitosamente!',
      data: {
        movieId: req.params.movieId,
        reviewId: review._id,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar la reseña',
      error: err.message,
    });
  }
});

// Actualizar reseña
router.put('/:movieId', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos incompletos',
        details: {
          rating: !rating ? 'Calificación requerida' : null,
          comment: !comment ? 'Comentario requerido' : null,
        },
      });
    }

    const review = await Review.findOne({
      movieId: req.params.movieId,
      user: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Reseña no encontrada',
        details: {
          movieId: req.params.movieId,
          userId: req.user.id,
        },
      });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    res.json({
      status: 'success',
      message: '¡Reseña actualizada exitosamente!',
      data: review,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar la reseña',
      error: err.message,
    });
  }
});

// Explorar reseñas (con filtros opcionales)
router.get('/explore', authMiddleware, async (req, res) => {
  try {
    const {
      movieId,
      username,
      page = 1,
      limit = 10,
      sortBy = 'recent', // 'recent', 'popular'
    } = req.query;

    // Excluir las reseñas del usuario actual
    const query = {
      isVisible: true,
      user: { $ne: req.user.id }, // No incluir las reseñas propias
    };

    let userIds = [];

    // Buscar usuarios por nombre similar si se proporciona username
    if (username) {
      const users = await User.find({
        username: { $regex: username, $options: 'i' },
        _id: { $ne: req.user.id }, // Excluir al usuario actual de la búsqueda
      }).select('_id');

      if (users.length === 0) {
        return res.json({
          status: 'success',
          message: 'No se encontraron usuarios con ese nombre',
          data: {
            reviews: [],
            total: 0,
            pages: 0,
            currentPage: 1,
          },
        });
      }

      userIds = users.map((user) => user._id);
      query.user = { $in: userIds };
    }

    // Filtrar por película si se proporciona movieId
    if (movieId) {
      query.movieId = movieId;
    }

    // Configurar ordenamiento
    let sort = {};
    switch (sortBy) {
      case 'popular':
        sort = { likesCount: -1, createdAt: -1 };
        break;
      default: // 'recent'
        sort = { createdAt: -1 };
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Obtener total de documentos para paginación
    const total = await Review.countDocuments(query);

    // Obtener reseñas con población de usuario y conteo de likes
    const reviews = await Review.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'username avatar')
      .lean();

    // Añadir información de likes para el usuario actual
    const reviewsWithLikeInfo = reviews.map((review) => ({
      ...review,
      hasLiked: review.likes.some((id) => id.toString() === req.user.id),
      likes: undefined, // No enviar la lista completa de likes al cliente
    }));

    res.json({
      status: 'success',
      message:
        reviewsWithLikeInfo.length > 0
          ? 'Reseñas encontradas'
          : 'No hay reseñas disponibles',
      data: {
        reviews: reviewsWithLikeInfo,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las reseñas',
      error: err.message,
    });
  }
});

// Dar/quitar like a una reseña
router.post('/:reviewId/like', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Reseña no encontrada',
      });
    }

    await review.toggleLike(req.user.id);

    res.json({
      status: 'success',
      message: review.likes.includes(req.user.id)
        ? '¡Me gusta añadido!'
        : 'Me gusta eliminado',
      data: {
        likesCount: review.likesCount,
        hasLiked: review.likes.includes(req.user.id),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al procesar el me gusta',
      error: err.message,
    });
  }
});

// Verificar si el usuario ha dado like a una reseña
router.get('/:reviewId/hasLiked', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Reseña no encontrada',
      });
    }

    res.json({
      status: 'success',
      data: {
        hasLiked: review.likes.includes(req.user.id),
        likesCount: review.likesCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'error',
      message: 'Error al verificar el me gusta',
      error: err.message,
    });
  }
});

// --- AUTOCOMPLETADO DE PELÍCULAS REGISTRADAS EN RESEÑAS ---
router.get('/search-movies', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res
        .status(400)
        .json({ msg: 'El término de búsqueda es requerido' });
    }
    // Buscar movieIds únicos de reseñas
    const reviews = await Review.find({ isVisible: true }).distinct('movieId');
    const results = [];
    const normalizedQuery = query.trim().toLowerCase();
    for (const movieId of reviews) {
      try {
        // Consultar detalles en español
        const { data: dataEs } = await axios.get(
          `${TMDB_BASE_URL}/movie/${movieId}`,
          {
            params: { language: 'es-ES' },
            headers: {
              Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
            },
          }
        );
        // Consultar detalles en inglés
        const { data: dataEn } = await axios.get(
          `${TMDB_BASE_URL}/movie/${movieId}`,
          {
            params: { language: 'en-US' },
            headers: {
              Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
            },
          }
        );
        // Normalizar títulos
        const normalizedTitleEs = (dataEs.title || '').toLowerCase();
        const normalizedTitleEn = (dataEn.title || '').toLowerCase();
        // Coincidencia flexible en ambos idiomas
        const matchEs =
          normalizedTitleEs.includes(normalizedQuery) ||
          normalizedQuery
            .split(' ')
            .every((word) => normalizedTitleEs.includes(word));
        const matchEn =
          normalizedTitleEn.includes(normalizedQuery) ||
          normalizedQuery
            .split(' ')
            .every((word) => normalizedTitleEn.includes(word));
        if (matchEs || matchEn) {
          const count = await Review.countDocuments({ movieId });
          results.push({
            movieId,
            title: dataEs.title || dataEn.title,
            year:
              dataEs.release_date || dataEn.release_date
                ? (dataEs.release_date || dataEn.release_date).split('-')[0]
                : null,
            poster: dataEs.poster_path
              ? `https://image.tmdb.org/t/p/w92${dataEs.poster_path}`
              : dataEn.poster_path
              ? `https://image.tmdb.org/t/p/w92${dataEn.poster_path}`
              : null,
            reviewsCount: count,
          });
        }
      } catch (err) {
        // Si falla la consulta a TMDB, ignorar esa película
      }
    }
    // Ordenar por cantidad de reseñas y limitar a 10 resultados
    results.sort((a, b) => b.reviewsCount - a.reviewsCount);
    res.json({ movies: results.slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al buscar películas registradas' });
  }
});

export default router;
