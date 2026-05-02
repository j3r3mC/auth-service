const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env.test');
console.log('Loading .env.test from:', envPath);

dotenv.config({ path: envPath });

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL);
