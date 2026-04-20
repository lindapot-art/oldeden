const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetArg = process.argv[2] || path.join('gameplay_screenshots', 'flow_run');
const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(process.cwd(), targetArg);
const outputPath = path.join(targetDir, '_image_audit.txt');

function listImages(dir) {
  return fs.readdirSync(dir)
    .filter(name => /\.(png|jpe?g|webp)$/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map(name => path.join(dir, name));
}

function summarizePixels(buffer) {
  let sum = 0;
  let sumSquares = 0;
  let dark = 0;
  let bright = 0;
  let edges = 0;
  for (let index = 0; index < buffer.length; index++) {
    const value = buffer[index];
    sum += value;
    sumSquares += value * value;
    if (value < 18) dark++;
    if (value > 220) bright++;
  }
  const total = Math.max(1, buffer.length);
  const mean = sum / total;
  const variance = Math.max(0, (sumSquares / total) - (mean * mean));
  const stdDev = Math.sqrt(variance);
  for (let index = 1; index < buffer.length; index++) {
    if (Math.abs(buffer[index] - buffer[index - 1]) > 24) edges++;
  }
  return {
    mean,
    stdDev,
    darkRatio: dark / total,
    brightRatio: bright / total,
    edgeRatio: edges / total,
  };
}

function classify(metrics) {
  const flags = [];
  if (metrics.mean < 10) flags.push('too-dark');
  if (metrics.stdDev < 6) flags.push('low-contrast');
  if (metrics.darkRatio > 0.94) flags.push('mostly-black');
  if (metrics.edgeRatio < 0.008) flags.push('low-detail');
  return flags;
}

async function inspectImage(filePath) {
  const { data } = await sharp(filePath)
    .resize({ width: 320, height: 180, fit: 'inside' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const metrics = summarizePixels(data);
  const flags = classify(metrics);
  return {
    file: path.basename(filePath),
    metrics,
    flags,
  };
}

(async () => {
  if (!fs.existsSync(targetDir)) {
    console.error('[qa-image-audit] Directory not found:', targetDir);
    process.exit(1);
  }

  const files = listImages(targetDir);
  if (files.length === 0) {
    console.error('[qa-image-audit] No images found in:', targetDir);
    process.exit(1);
  }

  const results = [];
  for (const file of files) {
    results.push(await inspectImage(file));
  }

  const flagged = results.filter(result => result.flags.length > 0);
  const severeFlagged = results.filter(result => result.flags.some(flag => flag !== 'low-detail'));
  const lines = [
    'Image QA Audit - ' + new Date().toISOString(),
    'Directory: ' + targetDir,
    'Images: ' + results.length,
    'Flagged: ' + flagged.length,
    'Severe: ' + severeFlagged.length,
    '',
  ];

  for (const result of results) {
    const { file, metrics, flags } = result;
    const summary = [
      file,
      'mean=' + metrics.mean.toFixed(1),
      'std=' + metrics.stdDev.toFixed(1),
      'dark=' + (metrics.darkRatio * 100).toFixed(1) + '%',
      'detail=' + (metrics.edgeRatio * 100).toFixed(1) + '%',
      flags.length ? 'flags=' + flags.join(',') : 'flags=none',
    ].join(' | ');
    lines.push(summary);
    console.log(summary);
  }

  fs.writeFileSync(outputPath, lines.join('\n') + '\n');
  console.log('\n[qa-image-audit] Report:', outputPath);
  process.exit(severeFlagged.length > 0 ? 1 : 0);
})().catch((error) => {
  console.error('[qa-image-audit] Fatal:', error.message);
  process.exit(1);
});