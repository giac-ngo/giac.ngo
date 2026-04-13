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
    if (safeSpaceId === 'global' || safeSpaceId === 'system') {
        return path.join(uploadsDir, 'media-library', safeSpaceId);
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

        const dir = getSpaceMediaDir(spaceId);

        try {
            if (!fs.existsSync(dir)) {
                return res.json([]);
            }

            const files = await fs.promises.readdir(dir);
            const mediaFiles = [];

            for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = await fs.promises.stat(filePath);

                if (stats.isFile()) {
                    let type = 'document';
                    const ext = path.extname(file).toLowerCase();
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'].includes(ext)) {
                        type = 'image';
                    } else if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
                        type = 'video';
                    } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
                        type = 'audio';
                    }

                    // Convert absolute path to route path for client
                    const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
                    const url = `/uploads/${relativePath}`;

                    mediaFiles.push({
                        name: file,
                        url,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        type,
                        ext
                    });
                }
            }

            // Sort by newest first
            mediaFiles.sort((a, b) => b.modifiedAt - a.modifiedAt);

            res.json(mediaFiles);
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
        const expectedPrefix = (safeSpaceId === 'global' || safeSpaceId === 'system') 
            ? `media-library/${safeSpaceId}/`
            : `space-${safeSpaceId}/media-library/`;

        try {
            const results = [];
            for (const url of urls) {
                const relativePath = url.replace(/^\/uploads\//, '');
                
                // SECURITY CHECK: Path traversal AND Space Isolation
                if (!relativePath.startsWith(expectedPrefix) || relativePath.includes('..')) {
                    results.push({ url, status: 'error', error: 'Unauthorized or invalid path traversal detected.' });
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
