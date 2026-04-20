const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const xml2js = require('xml2js');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static('public'));

let fullInventory = []; // Database temporaneo in memoria

//AGGREGATORE DI DATI (ETL):
//Questa funzione asincrona legge dati da tre formati diversi (JSON, XML, CSV).
//Ogni record viene arricchito con una proprietà 'fonte' per tracciarne l'origine nel frontend.
async function loadData() {
    fullInventory = [];
    try {
        // 1. Caricamento da JSON (Metodo sincrono)
        if (fs.existsSync('./data/magazzino.json')) {
            const datiJson = JSON.parse(fs.readFileSync('./data/magazzino.json', 'utf8'));
            datiJson.forEach(p => fullInventory.push({ ...p, fonte: 'JSON' }));
        }

        // 2. Caricamento da XML (Richiede parsing asincrono tramite xml2js)
        if (fs.existsSync('./data/magazzino.xml')) {
            const datiXml = fs.readFileSync('./data/magazzino.xml', 'utf8');
            const parser = new xml2js.Parser({ explicitArray: false });
            const resXml = await parser.parseStringPromise(datiXml);
            resXml.magazzino.item.forEach(p => fullInventory.push({ ...p, fonte: 'XML' }));
        }

        // 3. Caricamento da CSV (Utilizza stream per gestire file potenzialmente grandi)
        if (fs.existsSync('./data/magazzino.csv')) {
            return new Promise((resolve) => {
                fs.createReadStream('./data/magazzino.csv')
                    .pipe(csv())
                    .on('data', (row) => fullInventory.push({ ...row, fonte: 'CSV' }))
                    .on('end', resolve);
            });
        }
    } catch (err) {
        console.error("Errore nel caricamento file:", err);
    }
}

// Chiamata iniziale per popolare fullInventory all'avvio del server
loadData();

//ENDPOINT API: Recupero magazzino
//Restituisce l'intero array consolidato in formato JSON.
app.get('/api/magazzino', (req, res) => {
    res.json(fullInventory);
});

//ENDPOINT API: Aggiornamento quantità
//Riceve il nome del prodotto e la variazione (+1 o -1).
//Implementa una logica di controllo: la quantità non può mai scendere sotto lo zero.
app.post('/api/update', (req, res) => {
    const { prodotto, variazione } = req.body;
    // Ricerca l'oggetto corrispondente nel database in memoria
    const item = fullInventory.find(i => i.prodotto === prodotto);
    
    if (item) {
        let currentQty = parseInt(item.quantita);
        let nuovaQta = currentQty + variazione;
        
        // Math.max(0, ...) impedisce che un "acquisto" porti il magazzino in negativo
        item.quantita = Math.max(0, nuovaQta).toString();
        
        res.json({ success: true, nuovaQuantita: item.quantita });
    } else {
        res.status(404).send("Prodotto non trovato");
    }
});

app.listen(PORT, () => {
    console.log(`--- SERVER MAGAZZINO ATTIVO ---`);
    console.log(`URL locale: http://localhost:${PORT}/login.html`);
});