// server/db.ts
import { Request, Response, NextFunction } from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to map database rows to camelCase object keys
export const mapRowToCamelCase = (row: any): any => {
  if (!row) return null;
  const newObj: Record<string, any> = {};
  for (const key in row) {
    const camelCaseKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelCaseKey] = row[key];
  }
  return newObj;
};

export const verifyPassword = async (plainPassword: string, storedPassword?: string | null): Promise<boolean> => {
  let isMatch = false;
  if (!storedPassword) return false;

  if (storedPassword.startsWith('scrypt:')) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) return false;
    const [header, salt, hash] = parts;
    const headerParts = header.split(':');
    if (headerParts.length !== 4 || headerParts[0] !== 'scrypt') return false;
    const N = parseInt(headerParts[1], 10);
    const r = parseInt(headerParts[2], 10);
    const p = parseInt(headerParts[3], 10);
    const hashBuffer = Buffer.from(hash, 'hex');
    const keylen = hashBuffer.length;

    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(plainPassword, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, dk) => {
        if (err) return reject(err);
        resolve(dk as Buffer);
      });
    });

    if (hashBuffer.length !== derivedKey.length) {
      isMatch = false;
    } else {
      isMatch = crypto.timingSafeEqual(hashBuffer, derivedKey);
    }
  } else {
    isMatch = await bcrypt.compare(plainPassword, storedPassword);
  }
  return isMatch;
};