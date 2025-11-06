#!/usr/bin/env node
const url = 'http://localhost:3001/api/version';

(async () => {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('status', res.status, 'body', data);
    process.exit(0);
  } catch (e) {
    console.error('ping failed', e?.message || e);
    process.exit(2);
  }
})();
