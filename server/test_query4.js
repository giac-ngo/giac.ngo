import fs from 'fs';

function analyzeWav(filePath) {
  const buffer = fs.readFileSync(filePath);
  const dataStart = 44; // Assuming standard WAV header
  let sum = 0;
  let maxAbs = 0;
  let numSamples = (buffer.length - dataStart) / 2;
  
  for (let i = dataStart; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    sum += sample;
    if (Math.abs(sample) > maxAbs) maxAbs = Math.abs(sample);
  }
  
  console.log('Little Endian:');
  console.log('Average:', sum / numSamples);
  console.log('Max Abs:', maxAbs);
  
  sum = 0;
  maxAbs = 0;
  for (let i = dataStart; i < buffer.length; i += 2) {
    const sample = buffer.readInt16BE(i);
    sum += sample;
    if (Math.abs(sample) > maxAbs) maxAbs = Math.abs(sample);
  }
  
  console.log('Big Endian:');
  console.log('Average:', sum / numSamples);
  console.log('Max Abs:', maxAbs);
}

analyzeWav('test_output.wav');
