const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting BrandLedger frontend build...');
execSync('npm run build', { stdio: 'inherit' });
console.log('Build completed successfully.');
