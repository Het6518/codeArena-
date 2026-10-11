require('dotenv').config();
const { Client, Pool } = require('pg');

/**
 * =========================================================================
 * PART 1: STANDARD POSTGRESQL OPERATIONS VIA NODE.JS (pg)
 * - Create a Database
 * - Create a Table (Auth/Users)
 * - Insert a Record
 * - Update the Record
 * =========================================================================
 */

// Parse the DATABASE_URL to get host, port, user, password, and database name
const connectionUrl = process.env.DATABASE_URL || 'postgresql://postgres:het123H@@localhost:5432/codearena_db';
const url = new URL(connectionUrl.replace('postgresql://', 'http://')); // for URL parsing helper
const dbUser = decodeURIComponent(url.username);
const dbPassword = decodeURIComponent(url.password);
const dbHost = url.hostname;
const dbPort = parseInt(url.port, 10) || 5432;
const targetDbName = url.pathname.replace(/^\//, '') || 'codearena_db';

/**
 * 1. Operation: Create Database
 * Note: In PostgreSQL, 'CREATE DATABASE' cannot be executed inside a transaction block,
 * and you cannot be connected to the database you are creating. Hence, we connect to
 * the default 'postgres' database first to create the target database if it does not exist.
 */
async function createDatabaseIfNotExists(databaseName) {
  console.log(`\n--- [1] Checking / Creating Database '${databaseName}' ---`);
  const adminClient = new Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: 'postgres', // default administrative db
  });

  try {
    await adminClient.connect();
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const res = await adminClient.query(checkDbQuery, [databaseName]);

    if (res.rowCount === 0) {
      // In PostgreSQL, database names cannot be parameterized in DDL, so sanitize/quote
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      console.log(` Database '${databaseName}' created successfully.`);
    } else {
      console.log(` Database '${databaseName}' already exists.`);
    }
  } catch (err) {
    console.error(` Error checking/creating database:`, err.message);
  } finally {
    await adminClient.end();
  }
}

/**
 * Main demonstration function running on the target database
 */
async function runDemonstration() {
  // Step 1: Ensure database exists
  await createDatabaseIfNotExists(targetDbName);

  // Create pool to connect directly to targetDbName
  const pool = new Pool({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: targetDbName,
  });

  try {
    const client = await pool.connect();
    console.log(`\n Connected to PostgreSQL database: '${targetDbName}'`);

    /**
     * 2. Operation: Create Table (Auth/Users Table)
     */
    console.log('\n--- [2] Creating Table (users) ---');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rating INT DEFAULT 1200,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log(' Table "users" verified / created successfully.');

    /**
     * 3. Operation: Insert Record
     */
    console.log('\n--- [3] Inserting Record ---');
    const insertQuery = `
      INSERT INTO users (username, email, password, rating)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET username = EXCLUDED.username
      RETURNING *;
    `;
    const insertValues = ['coder_alex', 'alex@example.com', 'hashed_pwd_secret_123', 1250];
    const insertResult = await client.query(insertQuery, insertValues);
    console.log(' Record Inserted successfully:', insertResult.rows[0]);

    // Insert another record for list / unique testing
    const secondUser = ['sarah_dev', 'sarah@example.com', 'hashed_pwd_secret_456', 1400];
    await client.query(insertQuery, secondUser);
    console.log(' Second Record added for testing.');

    /**
     * 4. Operation: Update Record
     */
    console.log('\n--- [4] Updating Record ---');
    const updateQuery = `
      UPDATE users
      SET rating = $1
      WHERE email = $2
      RETURNING *;
    `;
    const updateValues = [1350, 'alex@example.com'];
    const updateResult = await client.query(updateQuery, updateValues);
    console.log(' Record Updated successfully:', updateResult.rows[0]);

    /**
     * =========================================================================
     * PART 2: OPERATIONS USING POSTGRESQL USER-DEFINED FUNCTIONS (UDF)
     * - Define UDFs (PL/pgSQL)
     * - Select record (all)
     * - Select unique (by email)
     * - Delete record
     * - Drop table
     * =========================================================================
     */
    console.log('\n=============================================================');
    console.log('PART 2: USER-DEFINED FUNCTIONS (UDF) DEMONSTRATION');
    console.log('=============================================================');

    /**
     * 2.1 CREATE USER-DEFINED FUNCTIONS
     */
    console.log('\n--- Creating User-Defined Functions in PostgreSQL ---');

    // UDF: Select All Users
    const udfSelectAll = `
      CREATE OR REPLACE FUNCTION get_all_users()
      RETURNS TABLE(id INT, username VARCHAR, email VARCHAR, rating INT, created_at TIMESTAMP)
      LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY SELECT u.id, u.username, u.email, u.rating, u.created_at FROM users u ORDER BY u.id ASC;
      END;
      $$;
    `;
    await client.query(udfSelectAll);
    console.log(' UDF "get_all_users()" created.');

    // UDF: Select Unique User by Email
    const udfSelectUnique = `
      CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR)
      RETURNS TABLE(id INT, username VARCHAR, email VARCHAR, rating INT, created_at TIMESTAMP)
      LANGUAGE plpgsql AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.username, u.email, u.rating, u.created_at
        FROM users u
        WHERE u.email = p_email
        LIMIT 1;
      END;
      $$;
    `;
    await client.query(udfSelectUnique);
    console.log(' UDF "get_user_by_email(p_email)" created.');

    // UDF: Delete User by ID
    const udfDeleteRecord = `
      CREATE OR REPLACE FUNCTION delete_user_by_id(p_user_id INT)
      RETURNS INT
      LANGUAGE plpgsql AS $$
      DECLARE
        deleted_count INT;
      BEGIN
        DELETE FROM users WHERE id = p_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$;
    `;
    await client.query(udfDeleteRecord);
    console.log(' UDF "delete_user_by_id(p_user_id)" created.');

    // // UDF: Drop Table
    // const udfDropTable = `
    //   CREATE OR REPLACE FUNCTION drop_users_table()
    //   RETURNS TEXT
    //   LANGUAGE plpgsql AS $$
    //   BEGIN
    //     EXECUTE 'DROP TABLE IF EXISTS users CASCADE';
    //     RETURN 'Table users dropped successfully';
    //   END;
    //   $$;
    // `;
    // await client.query(udfDropTable);
    // console.log(' UDF "drop_users_table()" created.');

    /**
     * 2.2 EXECUTE UDF: Select Records
     */
    console.log('\n--- [UDF-1] Executing UDF to Select All Records ---');
    const selectAllRes = await client.query('SELECT * FROM get_all_users();');
    console.log(` Found ${selectAllRes.rowCount} records:`, selectAllRes.rows);

    /**
     * 2.3 EXECUTE UDF: Select Unique Record
     */
    console.log('\n--- [UDF-2] Executing UDF to Select Unique Record ---');
    const selectUniqueRes = await client.query('SELECT * FROM get_user_by_email($1);', ['alex@example.com']);
    console.log(' Unique Record Found:', selectUniqueRes.rows[0]);

    /**
     * 2.4 EXECUTE UDF: Delete Record
     */
    console.log('\n--- [UDF-3] Executing UDF to Delete Record ---');
    const userToDeleteId = insertResult.rows[0].id;
    const deleteRes = await client.query('SELECT delete_user_by_id($1) AS deleted_rows;', [userToDeleteId]);
    console.log(` Deleted user with ID ${userToDeleteId}. Rows affected:`, deleteRes.rows[0].deleted_rows);

    // Verify remaining users
    const remainingRes = await client.query('SELECT * FROM get_all_users();');
    console.log(' Remaining users after delete:', remainingRes.rows);

    /**
     * 2.5 EXECUTE UDF: Drop Table
     */
    console.log('\n--- [UDF-4] Executing UDF to Drop Table ---');
    const dropRes = await client.query('SELECT drop_users_table() AS message;');
    console.log(' Result:', dropRes.rows[0].message);

    client.release();
    console.log('\n All operations completed successfully!');
  } catch (error) {
    console.error(' Error during demonstration:', error);
  } finally {
    await pool.end();
  }
}

// Execute demonstration
runDemonstration();
