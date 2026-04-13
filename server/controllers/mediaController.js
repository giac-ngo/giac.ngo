import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

// Helper to get space media directory
const getSpaceMediaDir = (spaceId) => {
    const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    // Global/root admin uploads → uploads/global/
    if (safeSpaceId === 'global' || safeSpaceId === 'system') {
        return path.join(uploadsDir, 'global');
    }
    return path.join(uploadsDir, `space-${safeSpaceId}`, 'media-library');
};

const storage = multer.memoryStorage(); // Use memory storage to process with sharp before saving

export const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size to allow videos
});

export const mediaController = {
    async getMediaFiles(req, res) {
        const { spaceId } = req.params;
        if (!spaceId) return res.status(400).json({ message: 'Space ID is required.' });

        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');

        // Always scan the full uploads/ tree so files are never missed due to
        // spaceId mismatches between local dev and production databases.
        // Then filter the results to only files that belong to the requested scope.
        const baseDir = uploadsDir;
        const scopePrefix = (safeSpaceId === 'global' || safeSpaceId === 'system')
            ? path.join(uploadsDir, 'global') + path.sep
            : path.join(uploadsDir, `space-${safeSpaceId}`) + path.sep;


        const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
        const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
        const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a']);

        // Recursively collect ALL files (no extension filter)
        async function walkDir(dir, results = []) {
            if (!fs.existsSync(dir)) return results;
            let entries;
            try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
            catch { return results; }
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walkDir(full, results);
                } else {
                    results.push(full); // include every file
                }
            }
            return results;
        }

        try {
            const allFiles = await walkDir(baseDir);
            // Filter to only paths that belong to this space/admin scope
            const scopedFiles = allFiles.filter(f => f.startsWith(scopePrefix));

            const mediaFiles = [];

            for (const filePath of scopedFiles) {

                const stats = await fs.promises.stat(filePath);
                const ext = path.extname(filePath).toLowerCase();
                let type = 'document';
                if (IMAGE_EXT.has(ext)) type = 'image';
                else if (VIDEO_EXT.has(ext)) type = 'video';
                else if (AUDIO_EXT.has(ext)) type = 'audio';

                const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
                const url = `/uploads/${relativePath}`;

                mediaFiles.push({
                    name: path.basename(filePath),
                    url,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime,
                    type,
                    ext
                });
            }

            // Sort by newest first
            mediaFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);

            // Pagination
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 60);
            const total = mediaFiles.length;
            const start = (page - 1) * limit;
            const paged = mediaFiles.slice(start, start + limit);

            res.json({ files: paged, total, page, limit, hasMore: start + limit < total });
        } catch (error) {
            console.error('Error reading media directory:', error);
            res.status(500).json({ message: 'Error fetching media files', error: error.message });
        }
    },

    async uploadMedia(req, res) {
        const { spaceId } = req.params;
        if (!spaceId) return res.status(400).json({ message: 'Space ID is required.' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files provided for upload.' });
        }

        const dir = getSpaceMediaDir(spaceId);
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            
            const uploadedUrls = [];

            for (const file of req.files) {
                const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const safeOriginalName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');
                
                let fileName = safeOriginalName;
                let finalBuffer = file.buffer;
                const ext = path.extname(safeOriginalName).toLowerCase();

                // Process Images with Sharp
                if (file.mimetype.startsWith('image/')) {
                    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                        const image = sharp(file.buffer);
                        const metadata = await image.metadata();

                        let resizer = image;
                        if (metadata.width && metadata.width > 1920) {
                            resizer = resizer.resize(1920, null, { withoutEnlargement: true }); // Keep aspect ratio
                        }

                        // Optimize quality
                        if (ext === '.jpg' || ext === '.jpeg') {
                            resizer = resizer.jpeg({ quality: 80 });
                        } else if (ext === '.png') {
                            resizer = resizer.png({ quality: 80, compressionLevel: 9 });
                        } else if (ext === '.webp') {
                            resizer = resizer.webp({ quality: 80 });
                        }

                        finalBuffer = await resizer.toBuffer();
                    }
                }

                const filePath = path.join(dir, fileName);
                await fs.promises.writeFile(filePath, finalBuffer);

                const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
                uploadedUrls.push(`/uploads/${relativePath}`);
            }

            res.json({ success: true, urls: uploadedUrls });
        } catch (error) {
            console.error("Error saving media uploads:", error);
            res.status(500).json({ message: 'Failed to process and save files.' });
        }
    },

    async deleteMedia(req, res) {
        const { spaceId } = req.params;
        const { urls } = req.body;
        
        if (!spaceId) return res.status(400).json({ message: 'Space ID is required.' });
        if (!urls || !Array.isArray(urls)) {
            return res.status(400).json({ message: 'Missing URLs array.' });
        }

        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        // Global admin can delete from uploads/global/, space admins from uploads/space-{id}/
        const allowedPrefix = (safeSpaceId === 'global' || safeSpaceId === 'system')
            ? 'global/'
            : `space-${safeSpaceId}/`;


        try {
            const results = [];
            for (const url of urls) {
                const relativePath = url.replace(/^\/uploads\//, '');

                // SECURITY: must belong to this space + no path traversal
                if (!relativePath.startsWith(allowedPrefix) || relativePath.includes('..')) {
                    results.push({ url, status: 'error', error: 'Unauthorized or invalid path.' });
                    continue;
                }

                const filePath = path.join(uploadsDir, relativePath);
                
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                    results.push({ url, status: 'deleted' });
                } else {
                    results.push({ url, status: 'not-found' });
                }
            }

            res.json({ success: true, results });
        } catch (error) {
            console.error("Error deleting media files:", error);
            res.status(500).json({ message: 'Failed to delete files.', error: error.message });
        }
    }
};
