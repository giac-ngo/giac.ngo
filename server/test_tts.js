const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/system/tts/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${data.substring(0, 500)}...`);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(JSON.stringify({
  text: "Hello, this is a test.",
  provider: "gemini",
  model: "gemini-2.5-flash-preview-tts",
  voice: "Puck",
  lang: "vi",
  userId: 1, // Assume admin user is 1
  aiId: 1 // Assume AI 1 exists
}));
req.end();
