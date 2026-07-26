const jwt = require('jsonwebtoken');

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const authHeader = socket.handshake.headers.authorization;

  if (authToken) {
    return authToken;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const socketAuth = (socket, next) => {
  const token = getTokenFromSocket(socket);

  if (!token) {
    return next(new Error('Authentication token is required'));
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT secret is not configured'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return next(new Error('Invalid token'));
    }

    socket.user = {
      id: decoded.userId,
    };

    return next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
};

module.exports = socketAuth;
