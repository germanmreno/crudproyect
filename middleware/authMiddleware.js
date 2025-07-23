import jwt from 'jsonwebtoken';

// Middleware para verificar el token de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.header('authorization')?.startsWith('Bearer ')
    ? req.header('authorization').split(' ')[1]
    : req.header('x-auth-token');

  // Verificar si no hay token
  if (!token) return res.status(401).json({ msg: 'No hay token' });

  try {
    // Verificar el token usando el secreto que guardamos en las variables de entorno
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Añadir el payload del usuario (que contiene el ID) al objeto de la petición
    req.user = decoded; // { id, username, email }
    // Pasar el control a la siguiente función de middleware o al manejador de la ruta
    next();
  } catch {
    res.status(401).json({ msg: 'Token inválido' });
  }
};

export default authMiddleware;
