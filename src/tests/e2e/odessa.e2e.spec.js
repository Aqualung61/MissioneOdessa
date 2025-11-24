
// Test end-to-end per Missione Odessa App
// Richiede: playwright installato (npm install --save-dev @playwright/test)

import { test, expect } from '@playwright/test';

const baseURL = process.env.APP_URL || 'http://localhost:3001';

// Test API versione
// Verifica che /api/version risponda con la versione corretta
test('API /api/version restituisce versione', async ({ request }) => {
  const response = await request.get(`${baseURL}/api/version`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty('version');
  console.log('version:', data.version);
  // Puoi aggiungere qui un controllo sulla versione attesa
});

// Test API lingue
// Verifica che /api/lingue risponda con un array
test('API /api/lingue restituisce array', async ({ request }) => {
  const response = await request.get(`${baseURL}/api/lingue`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
  console.log('lingue:', data.length);
});

// Test API luoghi
// Verifica che /api/luoghi risponda con un array
test('API /api/luoghi restituisce array', async ({ request }) => {
  const response = await request.get(`${baseURL}/api/luoghi`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
  console.log('luoghi:', data.length);
});

// Test frontend: la pagina odessa1.html viene servita
test('Frontend /web/odessa1.html viene servito', async ({ page }) => {
  const response = await page.goto(`${baseURL}/web/odessa1.html`);
  expect(response.status()).toBe(200);
  await expect(page.locator('body')).toBeVisible();
});
