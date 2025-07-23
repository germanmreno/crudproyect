import jwt from 'jsonwebtoken';

// Middleware para verificar el token de autenticación
module.exports = function (req, res, next) {
  // Obtener el token del encabezado de la petición
  const token = req.header('x-auth-token');

  // Verificar si no hay token
  if (!token) {
    return res.status(401).json({ msg: 'No hay token, autorización denegada' });
  }

  // Verificar el token
  try {
    // Verificar el token usando el secreto que guardamos en las variables de entorno
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Añadir el payload del usuario (que contiene el ID) al objeto de la petición
    req.user = decoded.user;

    // Pasar el control a la siguiente función de middleware o al manejador de la ruta
    next();
  } catch (error) {
    // Si jwt.verify() falla (por ejemplo, porque el token ha expirado o es inválido), capturar el error
    res.status(401).json({ msg: 'El token no es válido' });
  }
};
