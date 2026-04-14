import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

/**
 * Get the upload directory for a space.
 * - Space-level (admin uploads): uploads/space-{id}/
 * - User-level (avatar, social): uploads/space-{id}/user-{userId}/
 * - Global/system: uploads/global/
 */
export const getSpaceUploadDir = (spaceId, userId = null) => {
    const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (safeSpaceId === 'global' || safeSpaceId === 'system') {
        return path.join(uploadsDir, 'global');
    }
    const base = path.join(uploadsDir, `space-${safeSpaceId}`);
    return userId ? path.join(base, `user-${userId}`) : base;
};

/**
 * Resolve unique filename — if name conflicts, append _ before extension.
 * e.g. file.jpg → file_.jpg → file__.jpg
 */
const resolveUniqueFilename = async (dir, fileName) => {
    let candidate = fileName;
    while (fs.existsSync(path.join(dir, candidate))) {
        const ext = path.extname(candidate);
        const base = path.basename(candidate, ext);
        candidate = `${base}_${ext}`;
    }
    return candidate;
};

const storage = multer.memoryStorage(); // Use memory storage to process with sharp before saving

export const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

export const mediaController = {
    async getMediaFiles(req, res) {
        const { spaceId } = req.params;
        if (!spaceId) return res.status(400).json({ message: 'Space ID is required.' });

        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const requestingUser = req.user;
        const isSuperAdmin = requestingUser?.permissions && requestingUser.permissions.includes('roles');
        const userId = requestingUser?.id;

        // Check if user is the owner of this specific space
        let isSpaceOwner = false;
        if (userId && !isSuperAdmin && /^\d+$/.test(safeSpaceId)) {
            try {
                const { pool } = await import('../db.js');
                const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [parseInt(safeSpaceId, 10)]);
                if (spaceRes.rows.length > 0 && spaceRes.rows[0].user_id === userId) {
                    isSpaceOwner = true;
                }
            } catch (e) {
                console.error('mediaController: failed to check space ownership', e.message);
            }
        }

        const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
        const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
        const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.MP3', '.WAV']);

        // Build list of allowed scope prefixes (with trailing sep for startsWith checks)
        const spaceRoot = path.join(uploadsDir, `space-${safeSpaceId}`);
        const allowedPrefixes = [];
        let skipUserDirs = false;

        if (safeSpaceId === 'global' || safeSpaceId === 'system') {
            // Global scope
            allowedPrefixes.push(path.join(uploadsDir, 'global') + path.sep);
        } else if (isSuperAdmin) {
            // Super admin: see all files in the space (including user dirs)
            allowedPrefixes.push(spaceRoot + path.sep);
        } else if (isSpaceOwner) {
            // Space owner:
            //   1. Root space files (skip ALL user-* dirs)  
            //   2. Only their own user-{id}/ subfolder
            allowedPrefixes.push(spaceRoot + path.sep); // root files
            allowedPrefixes.push(path.join(spaceRoot, `user-${userId}`) + path.sep); // own user dir
            skipUserDirs = true; // used in walkDir to skip OTHER user-* dirs
        } else {
            // Regular user: only their own user folder
            if (!userId) return res.status(401).json({ message: 'Unauthorized.' });
            allowedPrefixes.push(path.join(spaceRoot, `user-${userId}`) + path.sep);
        }

        // Recursively collect files
        async function walkDir(dir, results = []) {
            if (!fs.existsSync(dir)) return results;
            let entries;
            try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); }
            catch { return results; }
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subPath = path.join(dir, entry.name);
                    // If skipUserDirs: walk OTHER user dirs only if it's the owner's own folder
                    if (skipUserDirs && /^user-\d+$/.test(entry.name)) {
                        // Only recurse into owner's own folder
                        if (entry.name === `user-${userId}`) {
                            await walkDir(subPath, results);
                        }
                        // Skip all other user-* dirs
                        continue;
                    }
                    await walkDir(subPath, results);
                } else {
                    results.push(path.join(dir, entry.name));
                }
            }
            return results;
        }

        try {
            // Walk the relevant directories
            let startDirs;
            if (safeSpaceId === 'global' || safeSpaceId === 'system') {
                startDirs = [path.join(uploadsDir, 'global')];
            } else if (isSuperAdmin) {
                startDirs = [spaceRoot];
            } else if (isSpaceOwner) {
                startDirs = [spaceRoot]; // walkDir will handle user dir filtering
            } else {
                startDirs = [path.join(spaceRoot, `user-${userId}`)];
            }

            const allFiles = [];
            for (const dir of startDirs) {
                await walkDir(dir, allFiles);
            }

            // For space owner: filter out files from other user dirs
            // (walkDir already handles this via skipUserDirs logic)
            const mediaFiles = [];

            for (const filePath of allFiles) {
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
            mediaFiles.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

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

        const userId = req.user?.id;
        const requestingUser = req.user;
        const isSuperAdmin = requestingUser?.permissions?.includes('roles');

        // Determine upload scope:
        // - userScoped=true in body → user personal folder (social, avatar)
        // - Otherwise → space-level (admin uploads)
        const userScoped = req.body?.userScoped === 'true' || req.body?.userScoped === true;
        const targetUserId = userScoped ? userId : null;

        const dir = getSpaceUploadDir(spaceId, targetUserId);

        try {
            await fs.promises.mkdir(dir, { recursive: true });

            const uploadedUrls = [];

            for (const file of req.files) {
                const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                const safeOriginalName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');

                let finalBuffer = file.buffer;
                const ext = path.extname(safeOriginalName).toLowerCase();

                // Process Images with Sharp
                if (file.mimetype.startsWith('image/')) {
                    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                        const image = sharp(file.buffer);
                        const metadata = await image.metadata();
                        let resizer = image.rotate(); // auto-fix EXIF orientation
                        if (metadata.width && metadata.width > 1920) {
                            resizer = resizer.resize(1920, null, { withoutEnlargement: true });
                        }
                        if (ext === '.jpg' || ext === '.jpeg') resizer = resizer.jpeg({ quality: 80 });
                        else if (ext === '.png') resizer = resizer.png({ quality: 80, compressionLevel: 9 });
                        else if (ext === '.webp') resizer = resizer.webp({ quality: 80 });
                        finalBuffer = await resizer.toBuffer();
                    }
                }

                // Handle naming conflict: append _ before extension
                const fileName = await resolveUniqueFilename(dir, safeOriginalName);
                const filePath = path.join(dir, fileName);
                await fs.promises.writeFile(filePath, finalBuffer);

                const relativePath = path.relative(uploadsDir, filePath).replace(/\\/g, '/');
                uploadedUrls.push(`/uploads/${relativePath}`);
            }

            res.json({ success: true, urls: uploadedUrls });
        } catch (error) {
            console.error('Error saving media uploads:', error);
            res.status(500).json({ message: 'Failed to process and save files.' });
        }
    },

    async deleteMedia(req, res) {
        const { spaceId } = req.params;
        const { urls } = req.body;

        if (!spaceId) return res.status(400).json({ message: 'Space ID is required.' });
        if (!urls || !Array.isArray(urls)) return res.status(400).json({ message: 'Missing URLs array.' });

        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const requestingUser = req.user;
        const isSuperAdmin = requestingUser?.permissions?.includes('roles');
        const userId = requestingUser?.id;

        // Check space ownership from DB  
        let isSpaceOwner = false;
        if (userId && !isSuperAdmin && /^\d+$/.test(safeSpaceId)) {
            try {
                const { pool } = await import('../db.js');
                const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [parseInt(safeSpaceId, 10)]);
                if (spaceRes.rows.length > 0 && spaceRes.rows[0].user_id === userId) {
                    isSpaceOwner = true;
                }
            } catch (e) {
                console.error('mediaController deleteMedia: space ownership check failed', e.message);
            }
        }

        // Prefix helpers
        const spacePrefix = `space-${safeSpaceId}/`;
        const ownUserPrefix = `space-${safeSpaceId}/user-${userId}/`;

        try {
            const results = [];
            for (const url of urls) {
                const relativePath = url.replace(/^\/uploads\//, '');

                if (relativePath.includes('..')) {
                    results.push({ url, status: 'error', error: 'Invalid path.' });
                    continue;
                }

                const isSpaceFile = relativePath.startsWith(spacePrefix) || relativePath.startsWith('global/');
                const isInOtherUserDir = isSpaceFile &&
                    /\/user-\d+\//.test(relativePath) &&
                    !relativePath.startsWith(ownUserPrefix);

                if (isSuperAdmin) {
                    // Super admin: delete anything in scope
                    if (!isSpaceFile) {
                        results.push({ url, status: 'error', error: 'Out of scope.' });
                        continue;
                    }
                } else if (isSpaceOwner) {
                    // Space owner: can delete space root files + own user files
                    // CANNOT delete other users' files
                    if (!isSpaceFile) {
                        results.push({ url, status: 'error', error: 'Unauthorized.' });
                        continue;
                    }
                    if (isInOtherUserDir) {
                        results.push({ url, status: 'error', error: "Cannot delete other users' files." });
                        continue;
                    }
                } else {
                    // Regular user: only own user folder
                    if (!relativePath.startsWith(ownUserPrefix)) {
                        results.push({ url, status: 'error', error: 'Unauthorized.' });
                        continue;
                    }
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
            console.error('Error deleting media files:', error);
            res.status(500).json({ message: 'Failed to delete files.', error: error.message });
        }
    }
};

