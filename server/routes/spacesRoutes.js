import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spacesController } from '../controllers/spacesController.js';
import { checkPermission, isAuthenticated, optionalAuth } from '../middleware/authMiddleware.js';
import { aiConfigController } from '../controllers/aiConfigController.js';
import { spacePageController } from '../controllers/spacePageController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.join(__filename, '..'));
const uploadsDir = path.join(__dirname, 'uploads');

// Use flat space directory for space cover/logo/QR uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawId = req.params.id;
    let dir;
    if (rawId) {
      const safeId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
      dir = path.join(uploadsDir, `space-${safeId}`);
    } else {
      // New space — use a staging dir; controller will re-assign after space is created
      dir = path.join(uploadsDir, 'system', 'pending-space-assets');
    }
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();

router.get('/', spacesController.getAllSpaces);
router.get('/:id(\\d+)', spacesController.getSpaceById);
// Specific sub-routes MUST come before the generic /:slug route
router.get('/domain/:domain', spacesController.getSpaceByDomain);
router.get('/:slug/published-page/:pageSlug(*)?', spacePageController.servePublicPage);
router.get('/:slug', spacesController.getSpaceBySlug);
router.post('/', checkPermission('spaces'), upload.single('image'), spacesController.createSpace);
router.put('/:id', checkPermission('spaces'), upload.single('image'), spacesController.updateSpace);
router.delete('/:id', checkPermission('spaces'), spacesController.deleteSpace);

// --- Space Member Management ---
router.get('/:id/members', checkPermission('users'), spacesController.getMembers);
router.post('/:id/members', checkPermission('users'), spacesController.addMember);
router.delete('/:id/members/:userId', checkPermission('users'), spacesController.removeMember);

// Route to handle views on a space (public)
router.post('/:id/view', spacesController.incrementViews);

// Route to handle likes on a space (requires user to be logged in)
router.post('/:id/like', isAuthenticated, spacesController.likeSpace);

// Route to handle offerings (donations) to a space
router.post('/:id/offer', isAuthenticated, spacesController.makeOffering);

// Route for getting dharma talks for a specific space
router.get('/:id/dharma-talks', spacesController.getDharmaTalksBySpaceId);

// Route for getting documents for a specific space
router.get('/:id/documents', spacesController.getDocumentsBySpaceId);

// Route for getting AI configs for a specific space
router.get('/:id/ai-configs', aiConfigController.getAiConfigsBySpaceId);

// Route for uploading QR code image for a space (Admin/Space Owner only)
router.post('/:id/qr-code', checkPermission('spaces'), upload.single('qrImage'), spacesController.uploadQrCode);

// Route for confirming a QR donation (optional auth — guests allowed)
router.post('/:id/qr-donation', optionalAuth, spacesController.confirmQrDonation);

export default router;