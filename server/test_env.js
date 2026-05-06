import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKeys = Object.keys(process.env).filter(k => k.includes('API_KEY') || k.includes('GEM'));
console.log('Found keys in .env:', apiKeys.map(k => `${k}=${process.env[k]}`));
