import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Funzione per gestire la API azioni_setup
export async function azioni_setup(req, res) {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const idLingua = req.query.idLingua ? parseInt(req.query.idLingua, 10) : 1;
    
    // Parametro log: default '0' se non specificato, accetta solo '0' o '1'
    const logParam = req.query.log || '0';
    if (logParam !== '0' && logParam !== '1') {
        return res.status(400).json({ status: 1, error: 'Parametro log deve essere 0 o 1' });
    }
    const logEnabled = logParam === '1';

    let log = [];

    if (logEnabled) {
        log.push('Avvio della API azioni_setup');
        log.push(`Parametri ricevuti: idLingua=${idLingua}, log=${logEnabled}`);
    }

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

        const updatedDirections = {};

        for (const azione of azioni) {

            if (logEnabled) {
                log.push(`Record Azioni selezionato: ${JSON.stringify(azione)}`);
            }

            // Aggiungi le direzioni aggiornate all'oggetto
            updatedDirections[azione.IDLuogo] = {
                Nord: azione.Nord,
                Est: azione.Est,
                Sud: azione.Sud,
                Ovest: azione.Ovest,
                Su: azione.Su,
                Giu: azione.Giu
            };

            if (logEnabled) {
                log.push(`Direzioni aggiornate per IDLuogo ${azione.IDLuogo}: ${JSON.stringify(updatedDirections[azione.IDLuogo])}`);
            }
        }

        if (logEnabled) {
            log.push('API azioni_setup completata con successo');
        }

        res.status(200).json({ status: 0, updatedDirections, log: logEnabled ? log : undefined });
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Errore sconosciuto';
        if (logEnabled) {
            log.push(`Errore: ${errorMessage}`);
        }
        res.status(500).json({ status: 1, error: errorMessage, log: logEnabled ? log : undefined });
    }
}

// Funzione per gestire la API azioni_modi
export async function azioni_modi(req, res) {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const idLingua = req.query.idLingua ? parseInt(req.query.idLingua, 10) : 1;
    
    // Parametro log: default '0' se non specificato, accetta solo '0' o '1'
    const logParam = req.query.log || '0';
    if (logParam !== '0' && logParam !== '1') {
        return res.status(400).json({ status: 1, error: 'Parametro log deve essere 0 o 1' });
    }
    const logEnabled = logParam === '1';

    // Validazione IDLuogo
    const idLuogo = req.query.IDLuogo ? parseInt(req.query.IDLuogo, 10) : null;
    if (!idLuogo || idLuogo <= 0) {
        return res.status(400).json({ status: 1, error: 'Parametro idLuogo deve essere un intero > 0' });
    }

    let log = [];

    if (logEnabled) {
        log.push('Avvio della API azioni_modi');
        log.push(`Parametri ricevuti: idLingua=${idLingua}, idLuogo=${idLuogo}, log=${logEnabled}`);
    }

    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Seleziona il record dalla tabella Azioni per sequenza 2
        const azione = await db.get(
            'SELECT * FROM Azioni WHERE IDLuogo = ? AND IDLingua = ? AND Sequenza = 2',
            idLuogo,
            idLingua
        );

        if (logEnabled) {
            log.push(`SQL eseguito: SELECT * FROM Azioni WHERE IDLuogo = ${idLuogo} AND IDLingua = ${idLingua} AND Sequenza = 2`);
            log.push(`Risultato SQL: ${JSON.stringify(azione)}`);
        }

        const updatedDirections = {};

        if (azione) {

            if (logEnabled) {
                log.push(`Record Azioni selezionato: ${JSON.stringify(azione)}`);
            }

            // Aggiungi le direzioni aggiornate per il luogo specificato in Azioni.IDLuogo
            updatedDirections[azione.IDLuogo] = {
                Nord: azione.Nord,
                Est: azione.Est,
                Sud: azione.Sud,
                Ovest: azione.Ovest,
                Su: azione.Su,
                Giu: azione.Giu
            };

            if (logEnabled) {
                log.push(`Direzioni aggiornate per IDLuogo ${azione.IDLuogo}: ${JSON.stringify(updatedDirections[azione.IDLuogo])}`);
            }
        } else {
            if (logEnabled) {
                log.push('Nessun record Azioni trovato per Sequenza = 2');
            }
        }

        if (logEnabled) {
            log.push('API azioni_modi completata con successo');
        }

        res.status(200).json({ status: 0, updatedDirections, log: logEnabled ? log : undefined });
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : 'Errore sconosciuto';
        if (logEnabled) {
            log.push(`Errore: ${errorMessage}`);
        }
        res.status(500).json({ status: 1, error: errorMessage, log: logEnabled ? log : undefined });
    }
}