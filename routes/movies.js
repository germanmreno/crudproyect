import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// La URL base de la API de The Movie Database (TMDb)
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
// Tu clave de API de TMDb, que se carga desde las variables de entorno.
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

console.log(2 + 2);

// --- RUTA PARA BUSCAR PELÍCULAS ---
// GET /api/movies/search?query=...
router.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query || !query.trim()) {
    return res.status(400).json({ msg: 'El término de búsqueda es requerido' });
  }

  try {
    const { data } = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        query: query.trim(),
        language: 'es-ES',
        page: 1,
      },
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      },
    });

    const results = (data.results || []).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? new Date(m.release_date).getFullYear() : null,
      poster: m.poster_path
        ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
        : null,
      overview: m.overview || '',
      vote_average: m.vote_average || 0,
    }));

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(502).json({ msg: 'Error al contactar la API externa' });
  }
});

/* GET /api/movies/:id
   Devuelve los detalles de UNA película desde TMDB */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const url = `${TMDB_BASE_URL}/movie/${id}`;
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      },
    });

    // Normalizamos lo que el front necesita
    res.json({
      id: data.id,
      title: data.title,
      year: data.release_date
        ? new Date(data.release_date).getFullYear()
        : null,
      poster: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null,
      overview: data.overview || '',
      vote_average: data.vote_average || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ msg: 'Error al obtener detalles de la película' });
  }
});

export default router;
