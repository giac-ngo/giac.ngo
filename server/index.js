// server/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to look for the .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });


// Force development mode if not explicitly set to production to prevent server crash
if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = 'development';
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import apiRoutes from './routes/index.js';
import { spaceModel } from './models/space.model.js';
import { spacePageController } from './controllers/spacePageController.js';
import { authenticateToken } from './middleware/authMiddleware.js';

const app = express();
const port = process.env.PORT || 3002;

const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');
fs.mkdir(uploadsDir, { recursive: true });


// CORS: đọc danh sách origin từ env (production) hoặc dùng wildcard cho dev
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Cho phép requests không có origin (mobile app, Postman, server-to-server)
        if (!origin) return callback(null, true);
        // Dev mode: cho phép tất cả
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        // Production: kiểm tra whitelist
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.startsWith('https://*.')) {
                const domain = allowed.replace('https://*.', '');
                return origin.endsWith('.' + domain) || origin === 'https://' + domain;
            }
            return allowed === origin;
        });
        if (isAllowed) return callback(null, true);
        return callback(new Error('CORS blocked: ' + origin));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Helmet: security headers ─────────────────────────────────────────────────
// CSP tắt vì React SPA dùng inline styles/scripts (sẽ bị chặn nếu bật CSP nghiêm)
// Các header bảo mật khác vẫn bật: HSTS, X-Frame-Options, X-Content-Type-Options...
app.use(helmet({
    contentSecurityPolicy: false,      // Tắt CSP để React SPA hoạt động
    crossOriginEmbedderPolicy: false,  // Tắt để load ảnh/font external
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Login/Register: giới hạn brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 20,                   // 20 lần/IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' },
    skip: () => process.env.NODE_ENV !== 'production', // Bỏ qua ở dev
});

// Chat stream: giới hạn để bảo vệ quota AI
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 60,             // 60 request/phút/IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Quá nhiều request. Vui lòng chờ 1 phút.' },
    skip: () => process.env.NODE_ENV !== 'production',
});

// Chung cho toàn bộ /api
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 300,            // 300 request/phút/IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Quá nhiều request. Vui lòng thử lại sau.' },
    skip: () => process.env.NODE_ENV !== 'production',
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/forgot-password', authLimiter);
app.use('/api/conversations/chat/stream', chatLimiter);
app.use('/api', generalLimiter);

// ── Static uploads ────────────────────────────────────────────────────────────
// Media files in space dirs are served publicly so <img>/<audio> tags work.
// Access control is handled at the API level, not the static file level.
app.use('/uploads', express.static(uploadsDir));



// --- Custom Domain Middleware ---
// Intercepts requests from custom space domains BEFORE API and static routes
app.use(async (req, res, next) => {
    try {
        const host = req.headers.host?.split(':')[0];
        const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
        const adminHost = process.env.ADMIN_HOST || ('login.' + mainDomain);
        // Skip the admin domain and localhost only — subdomains like tathata.bodhilab.io are space custom domains
        if (!host || host === mainDomain || host === adminHost || host === 'localhost') {
            return next();
        }
        // Skip direct API calls regardless of domain
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/assets/')) {
            return next();
        }

        // Skip requests for static files (JS, CSS, images, fonts, etc.)
        if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|txt|map)$/.test(req.path)) {
            return next();
        }

        // Skip system routes that should load the React SPA directly
        const systemRoutes = [
            '/login', '/register', '/forgot-password', '/reset-password',
            '/auth/callback', '/about', '/contact', '/privacy',
            '/terms', '/career', '/donation', '/finance', '/docs'
        ];
        if (systemRoutes.some(route => req.path === route || req.path.startsWith(route + '/'))) {
            return next();
        }

        // Skip dynamic SPA space routes like /:spaceSlug/chat, /:spaceSlug/admin, etc.
        const dynamicAppRoutePattern = /^\/[^\/]+\/(chat|admin|library|settings|dharma-talks|community)(\/.*)?$/;
        if (dynamicAppRoutePattern.test(req.path)) {
            return next();
        }

        const space = await spaceModel.findByCustomDomain(host);
        if (!space) return next();
        return spacePageController.serveCustomDomainPage(req, res, space);
    } catch (err) {
        console.error('Custom domain middleware error:', err);
        next();
    }
});

// --- API Routes ---
// Mount all API routes under the /api path
app.use('/api', apiRoutes);


// --- Static file serving & fallback for React Router ---
// Auto-detect: prefer dist/index.html, fall back to root/index.html
const distPath = path.join(projectRoot, 'dist');
const publicPath = existsSync(path.join(distPath, 'index.html')) ? distPath : projectRoot;
console.log(`[Static] Serving SPA from: ${publicPath}`);

// Hashed assets (JS/CSS/images with content hash in filename) → cache 1 year
app.use('/assets', express.static(path.join(publicPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
}));

// Themes & uploads → cache 1 day, must revalidate
app.use('/themes', express.static(path.join(projectRoot, 'client', 'public', 'themes'), {
    maxAge: '1d',
}));

// HTML & everything else → no cache (forces browser to always check for updates)
app.use(express.static(publicPath, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    },
}));


app.get('*', (req, res, next) => {
    // If the request is for an API route, let it pass to the 404 handler
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Otherwise, serve the main index.html for any non-API route.
    const indexFile = path.join(publicPath, 'index.html');
    res.sendFile(indexFile, (err) => {
        if (err) {
            console.error(`[Static] Could not serve index.html from ${indexFile}:`, err.message);
            res.status(404).send('App not deployed. Please upload the dist folder.');
        }
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});