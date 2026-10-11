const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 10;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Register User using Native PostgreSQL Connection (pg) on the app's "User" table
 */
const registerUser = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw createHttpError('All fields are required', 400);
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

  // 1. Check if user already exists using native SQL parameterized query on "User" table
  const checkQuery = `
    SELECT id FROM "User"
    WHERE email = $1 OR username = $2
    LIMIT 1;
  `;
  const existingUser = await pool.query(checkQuery, [cleanEmail, cleanUsername]);

  if (existingUser.rowCount > 0) {
    throw createHttpError('Email or username already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
  const id = crypto.randomUUID(); // generate unique ID matching text format

  // 2. Insert new record into "User" table using native SQL
  const insertQuery = `
    INSERT INTO "User" (id, username, email, password, "updatedAt")
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, username, email, rating, "createdAt";
  `;

  try {
    const result = await pool.query(insertQuery, [id, cleanUsername, cleanEmail, hashedPassword]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      // 23505 = PostgreSQL unique_violation
      throw createHttpError('Email or username already exists', 409);
    }
    throw error;
  }
};

/**
 * Login User using Native PostgreSQL Connection (pg) + PostgreSQL User-Defined Function (UDF)
 */
const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createHttpError('Email and password are required', 400);
  }

  if (!process.env.JWT_SECRET) {
    throw createHttpError('JWT secret is not configured', 500);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Call the PostgreSQL User-Defined Function (UDF) created in PostgreSQL: get_user_by_email()
  const udfQuery = `SELECT * FROM get_user_by_email($1);`;
  const result = await pool.query(udfQuery, [cleanEmail]);

  if (result.rowCount === 0) {
    throw createHttpError('Invalid email or password', 401);
  }

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);

  if (!isPasswordValid) {
    throw createHttpError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.jwtExpiresIn || '30d' }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      rating: user.rating,
      createdAt: user.createdAt,
    },
  };
};

module.exports = {
  loginUser,
  registerUser,
};
