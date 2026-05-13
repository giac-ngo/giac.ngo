// server/index.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv FIRST
dotenv.config({ path: path.resolve(__dirname, '.env') });

import logger from './utils/logger.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

logger.info(`JWT_SECRET is ${process.env.JWT_SECRET ? 'SET (starts with ' + process.env.JWT_SECRET.substring(0, 5) + '...)' : 'NOT SET'}`);

if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = 'development';
}

process.on('uncaughtException', (err) => {
    logger.error('CRITICAL: Uncaught Exception', err);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('CRITICAL: Unhandled Rejection', { promise: String(promise), reason });
});

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { authenticateToken } from './middleware/authMiddleware.js';
// @ts-ignore
import apiRoutes from './routes/index.js';
import { spaceModel } from './models/space.model.js';
import { spacePageController } from './controllers/spacePageController.js';
import { pool, mapRowToCamelCase } from './db.js';

const app = express();
app.set('trust proxy', true); // Allow rate limiter to correctly identify IPs behind multiple proxies (e.g. Nginx, Cloudflare)
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true
    }
});

const port = process.env.PORT || 3002;
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');
fs.mkdir(uploadsDir, { recursive: true });

// --- Rate Limiting ---
const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { message: 'Too many requests, please try again later.' }
});

const ttsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: { message: 'TTS quota exceeded for this hour.' }
});

app.use('/api/conversations/chat', chatLimiter);
app.use('/api/system/tts/generate', ttsLimiter);

// --- Middleware & Static ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.use(authenticateToken);

// --- Custom Domain Middleware ---
// Known SPA view segments that React Router handles — must NOT be intercepted
const SPA_VIEWS = new Set(['chat', 'library', 'dharmatalks', 'meditationtimer', 'admin', 'login', 'register', 'about', 'community', 'donation', 'finance', 'reset-password', 'auth']);

app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const host = req.headers.host?.split(':')[0];
        const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
        const adminHost = process.env.ADMIN_HOST || ('login.' + mainDomain);
        if (!host || host === mainDomain || host === adminHost || host === 'localhost') {
            return next();
        }
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/assets/')) {
            return next();
        }
        if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|txt|map)$/.test(req.path)) {
            return next();
        }
        // Skip SPA routes so React Router handles them (e.g. /tathata/chat, /tathata/admin)
        const segments = req.path.split('/').filter(Boolean);
        if (segments.length >= 2 && SPA_VIEWS.has(segments[1])) {
            return next();
        }
        // Also skip top-level SPA routes (e.g. /chat, /login on custom domains)
        if (segments.length === 1 && SPA_VIEWS.has(segments[0])) {
            return next();
        }
        const space = await spaceModel.findByCustomDomain(host);
        if (!space) return next();
        return spacePageController.serveCustomDomainPage(req, res, space);
    } catch (err: unknown) {
        logger.error('Custom domain middleware error', err);
        next();
    }
});

app.use('/api', apiRoutes);

// --- Socket.io Handlers ---
io.on('connection', (socket) => {
    socket.on('join-space', (spaceId) => {
        socket.join(`space-${spaceId}`);
    });
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
    });
});

// Export io to be used in controllers
app.set('io', io);

// --- Static file serving & SPA fallback ---
const distPath = path.join(projectRoot, 'dist');
const publicPath = existsSync(path.join(distPath, 'index.html')) ? distPath : projectRoot;

app.use('/assets', express.static(path.join(publicPath, 'assets'), { maxAge: '1y', immutable: true }));
app.use('/themes', express.static(path.join(projectRoot, 'client', 'public', 'themes'), { maxAge: '1d' }));
app.use(express.static(publicPath, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    },
}));

app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) return next();
    const indexFile = path.join(publicPath, 'index.html');
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isCrawler = /facebookexternalhit|twitterbot|telegrambot|whatsapp|zalo|linkedinbot|slackbot|discordbot|applebot|googlebot|bingbot|baiduspider|yandexbot|duckduckbot|rogerbot|pinterestbot|embedly|semrushbot|ahrefsbot/.test(ua);

    if (isCrawler) {
        try {
            const host = req.headers.host?.split(':')[0] || '';
            const mainDomain = (process.env.MAIN_DOMAIN || '').replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
            let spaceRes = await pool.query(`SELECT * FROM spaces WHERE custom_domain = $1 LIMIT 1`, [host]);
            if (!spaceRes.rows[0] && (host === mainDomain || host === `www.${mainDomain}` || !mainDomain)) {
                spaceRes = await pool.query(`SELECT * FROM spaces ORDER BY id ASC LIMIT 1`);
            }
            const space = spaceRes.rows[0] ? mapRowToCamelCase(spaceRes.rows[0]) : null;
            if (space) {
                let html = await fs.readFile(indexFile, 'utf8');
                const spaceName = space.name || host;
                const desc = space.description || spaceName;
                const ogImg = space.imageUrl && space.imageUrl.startsWith('http') ? space.imageUrl : `https://${host}/themes/giacngo/og-image.png`;
                const ogTags = `
    <meta property="og:type" content="website"><meta property="og:url" content="https://${host}/">
    <meta property="og:site_name" content="${spaceName}"><meta property="og:title" content="${spaceName}">
    <meta property="og:description" content="${desc}"><meta property="og:image" content="${ogImg}">
    <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="vi_VN">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${spaceName}"><meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${ogImg}"><meta name="description" content="${desc}">`;
                html = html.replace(/<title>[^<]*<\/title>/, `<title>${spaceName}</title>`);
                html = html.replace('</head>', `${ogTags}\n</head>`);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(html);
            }
        } catch (err) { logger.error('[OG Inject] Error', err); }
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexFile);
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logger.error(`GLOBAL ERROR [${req.method} ${req.originalUrl}]`, err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

httpServer.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
});
