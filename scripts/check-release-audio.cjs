const { stat } = require('node:fs/promises');
const path = require('node:path');

const filenames = [
  'rain.mp3',
  'cafe.mp3',
  'thunderstorm.mp3',
  'wind-leaves.mp3',
  'ocean.mp3',
  'forest.mp3',
  'fire.mp3'
];

async function main() {
  const missing = [];

  for (const filename of filenames) {
    try {
      const details = await stat(path.join(__dirname, '..', 'public', 'audio', filename));
      if (!details.isFile() || details.size < 1024) missing.push(filename);
    } catch {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    console.error(`Missing release audio: ${missing.join(', ')}`);
    console.error('See public/audio/README.md before creating a Windows package.');
    process.exitCode = 1;
    return;
  }

  console.log(`OK - ${filenames.length} licensed ambient recordings found`);
}

void main();
