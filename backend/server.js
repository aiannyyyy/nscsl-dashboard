// Load environment config first
const { config, database, corsOptions } = require('./config');

const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection.remoteAddress;
    const origin = req.get('Origin') || 'direct-access';
    console.log(`[${timestamp}] ${req.method} ${req.url} | Client: ${clientIP} | Origin: ${origin}`);
    next();
});

// ============================================
// PATHS SETUP
// ============================================

const publicPath = config.paths.public;
const uploadsPath = config.paths.uploads;

// Ensure directories exist
if (!fs.existsSync(publicPath)) {
    console.warn(`⚠️  Public directory not found: ${publicPath}`);
}
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsPath}`);
}

// ============================================
// STATIC FILE SERVING
// ============================================

app.use(express.static(publicPath));
app.use('/assets', express.static(path.join(publicPath, 'assets')));
app.use('/css', express.static(publicPath));
app.use('/js', express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

// ============================================
// ROOT & HEALTH CHECK ROUTES
// ============================================

app.get("/health", (req, res) => {
    const os = require('os');
    const serverIPs = Object.values(os.networkInterfaces())
        .flat()
        .filter(i => i.family === 'IPv4' && !i.internal)
        .map(i => i.address);

    res.json({
        status: "✅ Server is running",
        timestamp: new Date().toISOString(),
        server: {
            environment: config.env,
            port: config.server.port,
            host: config.server.host,
            ips: serverIPs
        },
        databases: {
            oracle: app.locals.oracleDb ? 'connected' : 'disconnected',
            mysql: 'connected'
        },
        paths: {
            public: publicPath,
            uploads: uploadsPath
        }
    });
});

// Test route
app.get("/test", (req, res) => {
    res.send(`
        <h1>✅ Network Test Successful!</h1>
        <p><strong>Server:</strong> ${config.server.host}:${config.server.port}</p>
        <p><strong>Environment:</strong> ${config.env}</p>
        <p><strong>Your IP:</strong> ${req.ip || req.connection.remoteAddress}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `);
});

// Oracle check
app.get("/api/check-oracle", async (req, res) => {
    if (!app.locals.oracleDb) {
        return res.status(500).json({ 
            error: "Oracle connection is not initialized",
            environment: config.env
        });
    }

    try {
        const connection = await app.locals.oracleDb.getConnection();
        await connection.execute('SELECT 1 FROM DUAL');
        await connection.close();
        res.json({ 
            message: "✅ Oracle connection pool is active!",
            environment: config.env
        });
    } catch (err) {
        res.status(500).json({
            error: "Oracle connection test failed",
            message: err.message
        });
    }
});

// MySQL check
app.get("/api/check-mysql", async (req, res) => {
    try {
        const connection = await database.mysqlPool.getConnection();
        await connection.query('SELECT 1 as test');
        connection.release();
        res.json({ 
            message: "✅ MySQL connection is active!",
            environment: config.env
        });
    } catch (err) {
        res.status(500).json({ 
            error: "MySQL connection failed", 
            message: err.message 
        });
    }
});

// ============================================
// DATABASE CONNECTIONS
// ============================================

// Connect to Oracle on startup (using connection pool)
database.createOraclePool()
    .then((pool) => {
        if (pool) {
            app.locals.oracleDb = pool;
            console.log("✅ Oracle connection pool stored in app.locals");

            const nsfController = require('./controllers/PDOController/nsfFacilitiesController');
            if (typeof nsfController.initSyncCron === 'function') {
                nsfController.initSyncCron(app);
            } else {
                console.error('❌ initSyncCron not found in controller exports');
            }
        }
    })
    .catch((err) => {
        console.error("❌ Oracle pool creation error:", err.message);
        if (config.isProduction) {
            process.exit(1);
        }
    });

// Store MySQL pool in app.locals
app.locals.mysqlDb = database.mysqlPool;
app.locals.inhouseDb = database.inhousePool;

// ============================================
// API ROUTES
// ============================================

// Authentication routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);
console.log("🔐 Authentication routes loaded");

// User Management (Admin)
app.use('/api/admin/users',  require('./routes/AdminRoutes/userRoutes'));
app.use('/api/admin/access', require('./routes/AdminRoutes/accessRoutes'));

// Facility Visits
app.use("/api/facility-visits", require("./routes/PDORoutes/facilityVisitsRoutes"));

// Notebooks
app.use("/api/notebooks", require("./routes/PDORoutes/notebooksRoutes"));

// Timeliness
app.use("/api/timeliness", require("./routes/PDORoutes/timelinessRoutes"));

// Car List
app.use("/api", require("./routes/PDORoutes/carListRoutes"));

// Sample Receive
app.use("/api/sample-receive", require("./routes/PDORoutes/sampleReceiveRoutes"));

// Sample Screened
app.use("/api/sample-screened", require("./routes/PDORoutes/sampleScreenedRoutes"));

// Lopez Purchase Filter Cards
app.use("/api/pdo", require("./routes/PDORoutes/lopezFilterCardRoutes"));

// NSF Facilities
app.use("/api/nsf", require("./routes/PDORoutes/nsfFacilitiesRoutes"));

// Calendar
app.use("/api/calendar", require("./routes/PDORoutes/calendarRoutes"));

// Total Samples of Quezon and Lopez Nearby
app.use("/api/samples", require("./routes/PDORoutes/quezonTotalSamplesRoutes"));

// Laboratory Card Summary
app.use("/api/laboratory/card-summary", require("./routes/LaboratoryRoutes/cardSummaryRoutes"));

// Laboratory Total Daily Samples
app.use("/api/laboratory/total-daily-samples", require("./routes/LaboratoryRoutes/labTotalDailySamplesRoutes"));

// Laboratory YTD Sample Comparison
app.use("/api/laboratory/ytd-sample-comparison", require("./routes/LaboratoryRoutes/ytdSampleComparisonRoutes"));

// Laboratory Tracking Stats
app.use("/api/laboratory/tracking-stats", require("./routes/LaboratoryRoutes/labTrackingRoutes"));

// Laboratory Lab Supplies
app.use("/api/laboratory/lab-supplies", require("./routes/LaboratoryRoutes/labSuppliesRoutes"));

// Laboratory Reagents
app.use("/api/laboratory/lab-reagents", require("./routes/LaboratoryRoutes/labReagentRoutes"));

// Laboratory Cumulative Census
app.use("/api/laboratory/census", require("./routes/LaboratoryRoutes/censusRoutes"));

// Laboratory Cumulative Annual Census
app.use("/api/laboratory/cumulative-annual-census", require("./routes/LaboratoryRoutes/cumulativeAnnualCencusRoutes"));

// Laboratory Demographic Summary Cards
app.use("/api/laboratory/demog-summary-cards", require("./routes/LaboratoryRoutes/demogSummaryCardsRoutes"));

// Laboratory Speed Monitoring
app.use("/api/speed-monitoring", require("./routes/LaboratoryRoutes/speedMonitoringRoutes"));

// Common Errors
app.use("/api/common-errors", require("./routes/LaboratoryRoutes/commonErrorRoutes"));

// Unsat Endorsement
app.use("/api/endorsements", require("./routes/LaboratoryRoutes/unsatEndorsementRoutes"));

// Laboratory Logbook Endorsement
app.use("/api/laboratory/logbook-endorsement", require("./routes/LaboratoryRoutes/logbookEndorsementRoutes"));

// IT Job Order Routes
app.use('/api/it-job-order', require('./routes/ITRoutes/itJobOrderRoutes'));

// Notification Routes
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Patient Details Routes
app.use('/api/followup', require('./routes/FollowupRoutes/patientDetailsRoutes'));

// Followup Endorsement
app.use('/api/followup/logbook-endorsement', require('./routes/FollowupRoutes/logbookEndorsementRoutes'));

// Followup Summary Cards
app.use('/api/followup/summary-cards', require('./routes/FollowupRoutes/followupSummaryCardsRoutes'));

// Followup CMS Urgent
app.use('/api/followup/cms-urgent', require('./routes/FollowupRoutes/cmsUrgentRoutes'));

// Followup auto Mailer
app.use('/api/followup/auto-mailer', require('./routes/FollowupRoutes/autoMailerRoutes'));

// Patient Information System
app.use('/api/laboratory/pis', require('./routes/LaboratoryRoutes/pisRoutes'));

// User Routes
app.use('/api/users', require('./routes/LaboratoryRoutes/userRoutes'));

// Unsatisfactory Analysis
app.use("/api/unsat", require("./routes/PDORoutes/unsatRoutes"));

// ============================================
// CHAT ROUTES
// ============================================
app.use('/api/chat', require('./routes/ChatRoutes/chatRoutes'));



// ============================================
// INTRANET ROUTES
// ============================================
app.use('/api/intranet/share', require('./routes/IntranetRoutes/shareRoutes'));

app.use('/api/intranet/files', require('./routes/IntranetRoutes/fileRoutes'));

app.use('/api/intranet/categories', require('./routes/IntranetRoutes/categoryRoutes'));

app.use('/api/intranet/move', require('./routes/IntranetRoutes/moveRoutes'));

app.use('/api/intranet/category-move', require('./routes/IntranetRoutes/categoryMoveRoutes'));

// NSF Performance
app.use("/api", require("./routes/PDORoutes/nsfPerformanceRoutes"));


console.log("💬 Chat routes loaded");

console.log("📋 API Routes loaded");

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err.stack || err.message || err);
    res.status(err.status || 500).json({
        status: "error",
        message: config.isDevelopment ? err.message : "Internal Server Error",
        stack: config.isDevelopment ? err.stack : undefined
    });
});

// ============================================
// REACT ROUTER FALLBACK (SPA Support)
// ============================================

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }

    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ 
            error: 'Application not built',
            message: 'Please build the frontend first by running: npm run build',
            path: indexPath
        });
    }
});

// ============================================
// 404 HANDLER (API Routes Only)
// ============================================

app.use("/api/*", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found",
        path: req.originalUrl,
        server: `${config.server.host}:${config.server.port}`,
        environment: config.env,
        available_endpoints: {
            health: "/health",
            test: "/test",
            checkOracle: "/api/check-oracle",
            checkMySQL: "/api/check-mysql",
            auth: {
                login: "/api/auth/login",
                logout: "/api/auth/logout",
                verify: "/api/auth/verify",
                me: "/api/auth/me"
            },
            chat: {
                conversations: "/api/chat/conversations",
                messages: "/api/chat/messages/:conversationId",
                users: "/api/chat/users",
                status: "/api/chat/status",
                reactions: "/api/chat/reactions",
                upload: "/api/chat/upload"
            },
            timeliness: "/api/timeliness",
            facilityVisits: "/api/facility-visits",
            notebooks: "/api/notebooks",
            sampleReceive: "/api/sample-receive",
            sampleScreened: "/api/sample-screened",
            unsat: "/api/unsat"
        }
    });
});

// ============================================
// HTTP SERVER + SOCKET.IO  ← NEW
// ============================================

const { initSocket } = require('./config/socket.config');

const server = http.createServer(app);

// Initialize Socket.IO (must be before server.listen)
const io = initSocket(server);
app.locals.io = io;

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal) {
    console.log(`\n${signal} signal received: closing connections gracefully...`);

    try {
        // Close HTTP server first (stops accepting new connections)
        server.close(() => {
            console.log('✅ HTTP server closed');
        });

        // Close Oracle pool
        if (database.closeOraclePool) {
            await database.closeOraclePool();
        }

        // Close MySQL pool
        if (database.mysqlPool) {
            await database.mysqlPool.end();
            console.log('✅ MySQL pool closed');
        }

        if (database.inhousePool) {
            await database.inhousePool.end();
            console.log('✅ Intranet MySQL pool closed');
        }

        console.log('✅ All connections closed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// ============================================
// START SERVER
// ============================================

const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('🚀 NSCSL Dashboard API Server');
    console.log('='.repeat(60));
    console.log(`📍 Environment: ${config.env.toUpperCase()}`);
    console.log(`🌐 Server running on: http://${HOST}:${PORT}`);
    console.log(`🔗 Local access: http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO: enabled`);
    console.log(`📂 Public path: ${publicPath}`);
    console.log(`📁 Uploads path: ${uploadsPath}`);
    console.log('='.repeat(60));
    console.log('');
});