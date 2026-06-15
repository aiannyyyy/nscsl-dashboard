'use strict';

// NOTE: dotenv is already loaded by config/index.js — do NOT call it again here

const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Required environment variables
const requiredEnvVars = [
    'ORACLE_USER',
    'ORACLE_PASS',
    'ORACLE_CONN_STRING',
    'HOST_DB',
    'USER_DB',
    'PASS_DB',
    'DATABASE_DB',
    'INTRANET_DB',
    'PORT',
    'FRONTEND_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
}

module.exports = {
    // Environment flags
    env: process.env.NODE_ENV || 'development',
    isDevelopment,
    isProduction,

    // Oracle Database
    oracle: {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASS,
        connectString: process.env.ORACLE_CONN_STRING
    },

    // MySQL - Dashboard Database
    mysql: {
        host: process.env.HOST_DB,
        user: process.env.USER_DB,
        password: process.env.PASS_DB,
        database: process.env.DATABASE_DB
    },

    // MySQL - Intranet Database (same server, different DB)
    intranet: {
        database: process.env.INTRANET_DB
    },

    // Server
    server: {
        port: parseInt(process.env.PORT, 10) || 3000,
        host: process.env.SERVER_HOST || '0.0.0.0',
        frontendUrl: process.env.FRONTEND_URL
    },

    // Paths
    paths: {
        uploads: process.env.UPLOADS_PATH || path.join(__dirname, '..', 'uploads'),
        public: process.env.PUBLIC_PATH || path.join(__dirname, '..', 'public')
    }
};