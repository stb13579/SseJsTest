import express from 'express';
import { cryptoSymbols, generateInitialPrices, simulatePriceChange } from './priceGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// Static frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));

const clients = [];
let prices = generateInitialPrices();

app.get('/prices', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const client = { id: clientId, res };
  clients.push(client);

  console.log(`Client connected: ${clientId} (total: ${clients.length})`);

  req.on('close', () => {
    clients.splice(clients.indexOf(client), 1);
    console.log(`Client disconnected: ${clientId} (total: ${clients.length})`);
  });
});

function broadcastPrices() {
  for (const symbol of cryptoSymbols) {
    prices[symbol] = simulatePriceChange(prices[symbol]);

    const update = {
      symbol,
      price: parseFloat(prices[symbol].toFixed(2)),
    };

    const message = `data: ${JSON.stringify(update)}\n\n`;

    clients.forEach((client) => client.res.write(message));
  }
}

setInterval(broadcastPrices, 2000);

app.listen(port, () => {
  console.log(`✅ SSE Crypto Price Server running at http://localhost:${port}`);
  console.log(`👉 Visit http://localhost:${port}/index.html to see the live feed`);
});
