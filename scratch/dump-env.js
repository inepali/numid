const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', 'app', 'api', 'test-env', 'route.ts');
const routeDir = path.join(__dirname, '..', 'app', 'api', 'test-env');

try {
  if (fs.existsSync(routePath)) {
    fs.unlinkSync(routePath);
    console.log('Deleted temporary API route file.');
  }
  if (fs.existsSync(routeDir)) {
    fs.rmdirSync(routeDir);
    console.log('Deleted temporary API route directory.');
  }
} catch (err) {
  console.error('Error during cleanup:', err.message);
}
