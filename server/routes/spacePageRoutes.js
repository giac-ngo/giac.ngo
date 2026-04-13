// server/routes/spacePageRoutes.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spacePageController } from '../controllers/spacePageController.js';
import { checkPermission } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.join(__filename, '..'));

// Dynamic upload destination: uploads/pages/<spaceId>/
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const spaceId = req.params.id;
        const dir = path.join(__dirname, '..', 'uploads', 'pages', String(spaceId));
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedExts = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed.`), false);
        }
    }
});

const router = Router();

// Pages CRUD (admin only)
router.get('/:id/pages', checkPermission('spaces'), spacePageController.listPages);
router.post('/:id/pages', checkPermission('spaces'), spacePageController.createPage);
router.get('/:id/pages/:pageId', checkPermission('spaces'), spacePageController.getPage);
router.put('/:id/pages/:pageId', checkPermission('spaces'), spacePageController.updatePage);
router.delete('/:id/pages/:pageId', checkPermission('spaces'), spacePageController.deletePage);

// Asset upload/delete (admin only)
router.post('/:id/page-assets', checkPermission('spaces'), upload.single('file'), spacePageController.uploadAsset);
router.delete('/:id/page-assets/:assetId', checkPermission('spaces'), spacePageController.deleteAsset);

// Public: contact form submission
router.post('/:id/contact', spacePageController.handleContactForm);

export default router;
