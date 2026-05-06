// server/utils/imageService.ts
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export const optimizeImage = async (inputPath: string): Promise<string> => {
    const ext = path.extname(inputPath).toLowerCase();
    const outputDir = path.dirname(inputPath);
    const fileName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDir, `${fileName}.webp`);

    try {
        await sharp(inputPath)
            .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Xóa file gốc để tiết kiệm bộ nhớ
        fs.unlink(inputPath, (err) => {
            if (err) logger.error(`Failed to delete original image: ${inputPath}`, err);
        });

        return outputPath;
    } catch (error) {
        logger.error(`Image optimization failed for ${inputPath}:`, error);
        return inputPath; // Trả về file gốc nếu nén lỗi
    }
};
