require('dotenv').config();
const { registerUser, loginUser } = require('../services/authServicePg');

async function testAuthFlow() {
  const testUsername = `user_${Date.now()}`;
  const testEmail = `${testUsername}@test.com`;
  const testPassword = 'Password123!';

  console.log(`\n--- 1. Testing Registration via Native PostgreSQL (pg) ---`);
  console.log(`Registering: ${testUsername} (${testEmail})`);
  const registeredUser = await registerUser({
    username: testUsername,
    email: testEmail,
    password: testPassword,
  });
  console.log('✓ Registered successfully in "User" table:', registeredUser);

  console.log(`\n--- 2. Testing Login via PostgreSQL User-Defined Function (UDF: get_user_by_email) ---`);
  const loginResult = await loginUser({
    email: testEmail,
    password: testPassword,
  });
  console.log('✓ Logged in successfully using UDF!');
  console.log('User Profile:', loginResult.user);
  console.log('JWT Token generated:', loginResult.token.substring(0, 30) + '...');

  process.exit(0);
}

testAuthFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
