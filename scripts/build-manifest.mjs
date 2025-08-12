import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'manifest.template.json');
const outPath = path.join(root, 'manifest.json');

const clientId = process.env.GOOGLE_CLIENT_ID;
if (!clientId) {
  console.error('🚨 GOOGLE_CLIENT_ID is not set. Aborting manifest build.');
  console.error('');
  console.error('To fix this:');
  console.error('  1. See OAUTH-SETUP.md for detailed instructions');
  console.error('  2. Set environment variable: export GOOGLE_CLIENT_ID="your-client-id"');
  console.error('  3. For testing: npm run build:test');
  console.error('');
  process.exit(1);
}

const template = readFileSync(templatePath, 'utf8');
const output = template.replaceAll('${GOOGLE_CLIENT_ID}', clientId);
writeFileSync(outPath, output, 'utf8');
console.log('manifest.json generated.');
