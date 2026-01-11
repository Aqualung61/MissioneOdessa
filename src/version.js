import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appVersion = JSON.parse(
  readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
).version;
