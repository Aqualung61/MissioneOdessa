import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Funzione per gestire la API azioni_setup
export async function azioni_setup(req, res) {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const idLingua = req.query.idLingua ? parseInt(req.query.idLingua, 10) : 1;
    const logEnabled = req.query.log === '1';

    let log = [];

    if (logEnabled) {
        log.push('Avvio della API azioni_setup');
        log.push(`Parametri ricevuti: idLingua=${idLingua}, log=${logEnabled}`);
    }

    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Seleziona i record dalla tabella Azioni
        const azioni = await db.all(
            'SELECT * FROM Azioni WHERE Sequenza = 1 AND IDLingua = ?',
            idLingua
        );

        if (logEnabled) {
            log.push(`SQL eseguito: SELECT * FROM Azioni WHERE Sequenza = 1 AND IDLingua = ${idLingua}`);
            log.push(`Risultato SQL: ${JSON.stringify(azioni)}`);
        }

        if (logEnabled) {
            log.push(`Record trovati in Azioni: ${azioni.length}`);
        }

        for (const azione of azioni) {
            if (logEnabled) {
                log.push(`Record Azioni selezionato: ${JSON.stringify(azione)}`);
            }

            // Recupera il record corrispondente in Luoghi
            const luogo = await db.get(
                'SELECT * FROM Luoghi WHERE ID = ? AND IDLingua = ?',
                azione.IDLuogo,
                azione.IDLingua
            );

            if (logEnabled) {
                log.push(`Record Luoghi prima dell'update: ${JSON.stringify(luogo)}`);
            }

            // Aggiorna il record in Luoghi
            await db.run(
                `UPDATE Luoghi SET Nord = ?, Est = ?, Sud = ?, Ovest = ?, Su = ?, Giu = ?
                 WHERE ID = ? AND IDLingua = ?`,
                azione.Nord,
                azione.Est,
                azione.Sud,
                azione.Ovest,
                azione.Su,
                azione.Giu,
                azione.IDLuogo,
                azione.IDLingua
            );

            if (logEnabled) {
                const updatedLuogo = await db.get(
                    'SELECT * FROM Luoghi WHERE ID = ? AND IDLingua = ?',
                    azione.IDLuogo,
                    azione.IDLingua
                );
                log.push(`Record Luoghi dopo l'update: ${JSON.stringify(updatedLuogo)}`);
            }
        }

        if (logEnabled) {
            log.push('API azioni_setup completata con successo');
        }

        res.status(200).json({ status: 0, log: logEnabled ? log : undefined });
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Errore sconosciuto';
        if (logEnabled) {
            log.push(`Errore: ${errorMessage}`);
        }
        res.status(500).json({ status: 1, error: errorMessage, log: logEnabled ? log : undefined });
    }
}