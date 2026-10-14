import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import { initOdessa } from '../src/initOdessa.js';

describe('initOdessa — caricamento dati tutto o niente (#94)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TB-03: con i file reali carica le 15 tabelle senza eccezioni', async () => {
    const data = await initOdessa();
    expect(Object.keys(data)).toHaveLength(15);
    expect(Object.keys(global.odessaData)).toHaveLength(15);
  });

  it('TB-02: un file illeggibile fa lanciare un errore che lo nomina', async () => {
    const realRead = fs.readFileSync;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fs, 'readFileSync').mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
      if (String(p).endsWith('Luoghi.json')) throw new Error('ENOENT simulato');
      return (realRead as (...args: unknown[]) => unknown)(p, ...rest);
    }) as typeof fs.readFileSync);

    await expect(initOdessa()).rejects.toThrow(/Luoghi\.json/);
  });

  it('TB-02: l\'errore elenca tutti i file non caricati', async () => {
    const realRead = fs.readFileSync;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fs, 'readFileSync').mockImplementation(((p: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
      if (String(p).endsWith('Luoghi.json') || String(p).endsWith('Oggetti.json')) throw new Error('ENOENT simulato');
      return (realRead as (...args: unknown[]) => unknown)(p, ...rest);
    }) as typeof fs.readFileSync);

    await expect(initOdessa()).rejects.toThrow(/Luoghi\.json.*Oggetti\.json/);
  });
});
