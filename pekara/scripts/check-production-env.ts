import { parseServerEnvironment } from '../src/config/env.ts';

parseServerEnvironment({ ...process.env, NODE_ENV: 'production' });
console.info('Production environment validation passed.');
