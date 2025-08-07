const tableBody = document.getElementById('price-table-body');
const prices = {};

function updateTable(symbol, price) {
  const now = new Date().toLocaleTimeString();
  const rowId = `row-${symbol}`;
  const existingRow = document.getElementById(rowId);

  let priceClass = '';
  if (prices[symbol] !== undefined) {
    priceClass = price > prices[symbol] ? 'price-up' : (price < prices[symbol] ? 'price-down' : '');
  }

  prices[symbol] = price;

  const html = `
    <tr id="${rowId}">
      <td>${symbol}</td>
      <td class="${priceClass}">$${price.toFixed(2)}</td>
      <td>${now}</td>
    </tr>
  `;

  if (existingRow) {
    existingRow.outerHTML = html;
  } else {
    tableBody.insertAdjacentHTML('beforeend', html);
  }
}

function connectToFeed() {
  const eventSource = new EventSource('/prices');

  eventSource.onmessage = function (event) {
    try {
      const data = JSON.parse(event.data);
      if (data.symbol && data.price) {
        updateTable(data.symbol, data.price);
      }
    } catch (e) {
      console.error('Invalid event data:', event.data);
    }
  };

  eventSource.onerror = function (err) {
    console.error('SSE connection error:', err);
    eventSource.close();
    // Optionally try to reconnect after a delay
  };
}

connectToFeed();
