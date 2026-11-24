const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting BrandLedger universal build...');

if (fs.existsSync('frontend')) {
  console.log('Detected monorepo root. Building frontend from subfolder...');
  execSync('npm --prefix frontend install && npm --prefix frontend run build', { stdio: 'inherit' });
  
  // Copy frontend/dist to root dist so Vercel finds it regardless of output settings
  if (fs.existsSync(path.join('frontend', 'dist'))) {
    fs.cpSync(path.join('frontend', 'dist'), 'dist', { recursive: true });
    console.log('Mirrored build output to ./dist');
  }
} else {
  console.log('Detected frontend working directory. Building directly...');
  execSync('npm install && npm run build', { stdio: 'inherit' });
}

console.log('Build completed successfully.');
