import readline from 'readline';
import { exec } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Vuoi allineare l'ambiente locale con GitHub? (s/N) ", (answer: string) => {
  if (answer.trim().toLowerCase() === 's') {
    rl.question('Inserisci il messaggio di commit: ', (commitMsg: string) => {
      if (!commitMsg.trim()) {
        console.log('Commit annullato: messaggio vuoto.');
        rl.close();
        return;
      }
      exec('git add -A', (err) => {
        if (err) {
          console.error('Errore in git add:', err);
          rl.close();
          return;
        }
        exec(`git commit -m "${commitMsg.replace(/"/g, '\"')}"`, (err, stdout, stderr) => {
          if (err) {
            if (stderr.includes('nothing to commit')) {
              console.log('Nessuna modifica da allineare.');
            } else {
              console.error('Errore in git commit:', stderr);
            }
            rl.close();
            return;
          }
          exec('git push', (err, stdout, stderr) => {
            if (err) {
              console.error('Errore in git push:', stderr);
            } else {
              console.log('Allineamento completato con successo!');
            }
            rl.close();
          });
        });
      });
    });
  } else {
    console.log('Operazione annullata.');
    rl.close();
  }
});
