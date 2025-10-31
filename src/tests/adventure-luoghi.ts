
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import readline from 'readline';

// Interfaccia Luogo con nomi colonne in inglese
interface Luogo {
  ID: number;
  Description: string;
  North: number;
  East: number;
  South: number;
  West: number;
  Up: number;
  Down: number;
}

// Direzioni valide (in italiano, mappate su colonne inglesi)
const DIRECTIONS = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'] as const;
type Direction = typeof DIRECTIONS[number];
const DIRECTION_TO_FIELD: Record<Direction, keyof Luogo> = {
  Nord: 'North',
  Est: 'East',
  Sud: 'South',
  Ovest: 'West',
  Su: 'Up',
  Giu: 'Down',
};

async function main() {
  const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const luoghi: Luogo[] = await db.all('SELECT * FROM Luoghi');
  let current: Luogo | undefined = luoghi.find(l => l.ID === 8);
  if (!current) {
    console.error('Record con ID=8 non trovato.');
    console.log('Luoghi caricati:', luoghi.map(l => l.ID));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function prompt() {
    if (!current) {
      console.error('Luogo corrente non definito.');
      process.exit(1);
    }
    console.log(`\n${current.Description}`);
    rl.question('Dove vuoi andare? (Nord, Est, Sud, Ovest, Su, Giu): ', (input) => {
      if (!DIRECTIONS.includes(input as Direction)) {
        console.log('Input non valido. Usa solo Nord, Est, Sud, Ovest, Su, Giu.');
        return prompt();
      }
      const field = DIRECTION_TO_FIELD[input as Direction];
      if (!current) {
        console.error('Luogo corrente non definito.');
        process.exit(1);
      }
      const nextId = current[field];
      if (!nextId || nextId === 0) {
        console.log('Non puoi andare in quella direzione.');
        return prompt();
      }
      const next = luoghi.find(l => l.ID === nextId);
      if (!next) {
        console.log(`Luogo con ID=${nextId} non trovato!`);
        return prompt();
      }
      current = next;
      prompt();
    });
  }

  prompt();
}


main().catch(err => {
  console.error('Errore:', err);
  process.exit(1);
});
