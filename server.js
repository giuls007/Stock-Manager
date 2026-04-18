//IMPORTAZIONE DEI MODULI (Librerie esterne come il modulo file system, estensione CSV e XML in js)
const express = require('express'); 
const fs = require('fs');           
const csv = require('csv-parser');  
const xml2js = require('xml2js');   

const app = express(); 
const PORT = 5000;     

//MIDDLEWARE STATIC: serve per dire ad Express che tutti i file dentro la cartella 'public'
//(come index.html e style.css) devono essere accessibili direttamente dal browser.
app.use(express.static('public'));

//DEFINIZIONE DELLA ROTTA API: /api/magazzino
//Questa funzione viene richiamata quando il client (HTML) esegue la fetch().
//Usiamo 'async' perché la lettura dei file (specialmente XML e CSV) è un'operazione asincrona.
app.get('/api/magazzino', async (req, res) => {
    try {
        //Creiamo un contenitore vuoto (Array) dove uniremo i 18 prodotti
        let inventarioTotale = [];

        // --- GESTIONE FILE JSON ---
        //Leggiamo il file come testo e usiamo JSON.parse per trasformarlo in un oggetto lavorabile e per ogni prodotto aggiungiamo l'etichetta "JSON"
        const datiJson = JSON.parse(fs.readFileSync('./data/magazzino.json', 'utf8'));
        datiJson.forEach(p => inventarioTotale.push({ ...p, fonte: 'JSON' }));

        // --- GESTIONE FILE XML ---
        //Leggiamo il file XML come testo grezzo
        const datiXml = fs.readFileSync('./data/magazzino.xml', 'utf8');
        //Creiamo un'istanza del parser XML
        const parser = new xml2js.Parser({ explicitArray: false });
        //'parseStringPromise' trasforma il testo XML in un oggetto JavaScript (usiamo await per attendere la fine)
        const resultXml = await parser.parseStringPromise(datiXml);
        //Navighiamo nella struttura del file (magazzino -> item) e aggiungiamo la fonte "XML"
        resultXml.magazzino.item.forEach(p => inventarioTotale.push({ ...p, fonte: 'XML' }));

        // --- GESTIONE FILE CSV ---
        //Il CSV viene letto tramite uno "Stream" (un flusso di dati).
        fs.createReadStream('./data/magazzino.csv')
            .pipe(csv()) // Trasforma ogni riga del CSV in un oggetto { prodotto, categoria, quantita }
            .on('data', (row) => {
                //Ogni volta che viene letta una riga, la aggiungiamo all'array con la fonte "CSV"
                inventarioTotale.push({ ...row, fonte: 'CSV' });
            })
            .on('end', () => {
                //CALLBACK DI CHIUSURA: Inviamo la risposta al browser solo quando il CSV è stato letto completamente.
                // inventarioTotale contiene tutti i 18 prodotti 
                res.json(inventarioTotale);
            });

    } catch (err) {
        //In caso di file mancanti o errori di sintassi nei file dati
        console.error("Errore nel caricamento del magazzino:", err);
        res.status(500).send("Errore interno del server");
    }
});

//AVVIO DEL SERVER
//La funzione listen() mette il server in uno stato di attesa.
//Da questo momento il server risponde se scrivi http://localhost:5000 nel browser.
app.listen(PORT, () => {
    console.log(`--- SERVER MAGAZZINO ATTIVO ---`);
    console.log(`Endpoint API: http://localhost:${PORT}/api/magazzino`);
});
