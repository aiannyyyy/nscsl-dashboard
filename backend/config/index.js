'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

const result = dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

if (result.error) {
    console.error(`❌ Failed to load ${envFile}:`, result.error.message);
    process.exit(1);
}

console.log(`🔧 Environment : ${process.env.NODE_ENV.toUpperCase()}`);
console.log(`📦 Database    : ${process.env.DATABASE_DB}`);
console.log(`🗄️  Oracle      : ${process.env.ORACLE_CONN_STRING}`);

const database = require('./database');
const config = require('./env.config');
const corsOptions = require('./cors');
const upload = require('./multer');

module.exports = { database, config, corsOptions, upload };