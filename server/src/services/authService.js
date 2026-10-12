const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 10;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const registerUser = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw createHttpError('All fields are required', 400);
  }

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw createHttpError('Username, email, and password must be strings', 400);
  }

  if (username.length > 30 || email.length > 254 || password.length > 128) {
    throw createHttpError('One or more fields are too long', 400);
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (cleanUsername.length < 3) {
    throw createHttpError('Username must be at least 3 characters long', 400);
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    throw createHttpError('Username can only contain letters, numbers, and underscores', 400);
  }

  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    throw createHttpError('Please provide a valid email address', 400);
  }

  if (cleanPassword.length < 6) {
    throw createHttpError('Password must be at least 6 characters long', 400);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: cleanEmail }, { username: cleanUsername }],
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw createHttpError('Email or username already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(cleanPassword, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Email or username already exists', 409);
    }

    throw error;
  }
};

const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError('Email and password are required', 400);
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw createHttpError('Email and password must be strings', 400);
  }

  if (!process.env.JWT_SECRET) {
    throw createHttpError('JWT secret is not configured', 500);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  const user = await prisma.user.findUnique({
    where: {
      email: cleanEmail,
    },
    select: {
      id: true,
      username: true,
      email: true,
      password: true,
      role: true,
      rating: true,
      wins: true,
      losses: true,
      draws: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw createHttpError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);

  if (!isPasswordValid) {
    throw createHttpError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  ); // jwt token is generated or created here with the user id and secret key and expires in 30 days

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      rating: user.rating,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      createdAt: user.createdAt,
    },
  };
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      rating: true,
      wins: true,
      losses: true,
      draws: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw createHttpError('User not found', 404);
  }

  return user;
};

module.exports = {
  getUserById,
  loginUser,
  registerUser,
};
