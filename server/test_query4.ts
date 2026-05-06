import { geminiService } from './services/geminiService.js';
import fs from 'fs';

async function test() {
  try {
    const key = "AIzaSyDeDGDzwk_SCjsfUn1bN-K2W2axbVTjQZA";
    console.log('Testing TTS with gemini-3.1-flash-tts-preview...');
    const result = await geminiService.generateTts(
      "Giác Ngộ Là Gì? Giác Ngộ không phải là một cái gì đó để Quý Vị đạt được.", 
      key, 
      "gemini-3.1-flash-tts-preview", 
      "Aoede", 
      "", 
      1 
    );
    
    fs.writeFileSync('test_output2.wav', Buffer.from(result.audioContent, 'base64'));
    console.log('Saved to test_output2.wav. MimeType:', result.mimeType);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
