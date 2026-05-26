import fs from 'fs';
import path from 'path';

const distServerDir = path.join(process.cwd(), 'dist', 'server');
const target = path.join(distServerDir, 'server.js');
const content = `import * as serverIndex from './index.js';

export default serverIndex.default ?? serverIndex;
export * from './index.js';
`;

try {
  if (!fs.existsSync(distServerDir)) {
    console.warn('dist/server directory not found; skipping creation of server wrapper.');
    process.exit(0);
  }
  fs.writeFileSync(target, content, 'utf8');
  console.log('Wrote', target);
} catch (err) {
  console.error('Failed to write server wrapper:', err);
  process.exit(1);
}
