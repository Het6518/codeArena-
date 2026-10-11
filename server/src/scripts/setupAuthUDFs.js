require('dotenv').config();
const { pool } = require('../config/db');

async function setupAuthUDFs() {
  console.log('--- Setting up User-Defined Functions for the "User" table in PostgreSQL ---');

  try {
    // Drop existing functions if parameter/return types changed
    await pool.query(`DROP FUNCTION IF EXISTS get_all_users();`);
    await pool.query(`DROP FUNCTION IF EXISTS get_user_by_email(VARCHAR);`);
    await pool.query(`DROP FUNCTION IF EXISTS get_user_by_email(TEXT);`);
    await pool.query(`DROP FUNCTION IF EXISTS delete_user_by_id(INT);`);
    await pool.query(`DROP FUNCTION IF EXISTS delete_user_by_id(TEXT);`);

    // 1. UDF to select all users from the "User" table
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_all_users()
      RETURNS TABLE(
        id TEXT,
        username TEXT,
        email TEXT,
        rating INT,
        "createdAt" TIMESTAMP
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.username, u.email, u.rating, u."createdAt"
        FROM "User" u
        ORDER BY u."createdAt" DESC;
      END;
      $$;
    `);
    console.log('✓ UDF get_all_users() created successfully.');

    // 2. UDF to select a unique user by email
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
      RETURNS TABLE(
        id TEXT,
        username TEXT,
        email TEXT,
        password TEXT,
        rating INT,
        "createdAt" TIMESTAMP
      )
      LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.username, u.email, u.password, u.rating, u."createdAt"
        FROM "User" u
        WHERE u.email = p_email
        LIMIT 1;
      END;
      $$;
    `);
    console.log('✓ UDF get_user_by_email(p_email) created successfully.');

    // 3. UDF to delete a user by id
    await pool.query(`
      CREATE OR REPLACE FUNCTION delete_user_by_id(p_user_id TEXT)
      RETURNS INT
      LANGUAGE plpgsql AS $$
      DECLARE
        deleted_count INT;
      BEGIN
        DELETE FROM "User" WHERE id = p_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$;
    `);
    console.log('✓ UDF delete_user_by_id(p_user_id) created successfully.');

    // Verify by calling get_all_users()
    const res = await pool.query('SELECT * FROM get_all_users();');
    console.log(`\nVerified: Found ${res.rowCount} users in "User" table via UDF.`);

    console.log('\n--- UDF Setup Complete! ---');
    console.log('Open pgAdmin -> Databases -> codearena_db -> Schemas -> public:');
    console.log('  1. Tables: "User"');
    console.log('  2. Functions: get_all_users, get_user_by_email, delete_user_by_id');
  } catch (err) {
    console.error('Error setting up UDFs:', err);
  } finally {
    await pool.end();
  }
}

setupAuthUDFs();
