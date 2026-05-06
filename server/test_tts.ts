import { pool } from './db.js';
import { cryptoService } from './services/cryptoService.js';
import { geminiService } from './services/geminiService.js';

async function testTts() {
  console.log('Starting TTS generation...');
  const startTime = Date.now();
  
  try {
    const res = await pool.query('SELECT api_keys FROM users WHERE id = 1 LIMIT 1');
    const apiKeys = res.rows[0]?.api_keys;
    if (!apiKeys?.gemini) {
      console.log('No Gemini key in user 1');
      return;
    }
    const apiKey = cryptoService.decrypt(apiKeys.gemini);
    
    console.log('Using API key starting with:', apiKey.substring(0, 8));
    
    const text = 'Tạm biệt. Khi nào cần, cứ quay lại. Chân lý vẫn luôn hiển hiện nơi đây.';
    
    const result = await geminiService.generateTts(
      text, 
      apiKey, 
      'gemini-2.5-flash-preview-tts', // model
      'Aoede', // voice
      '', // styleInstruction
      1 // temperature
    );
    
    const endTime = Date.now();
    console.log(`Success! Took ${endTime - startTime}ms`);
    console.log('Result length:', result?.audioContent?.length || result?.length);
  } catch (error) {
    const endTime = Date.now();
    console.error(`Failed after ${endTime - startTime}ms`);
    console.error(error);
  } finally {
    process.exit();
  }
}

testTts();
