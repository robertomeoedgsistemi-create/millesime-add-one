require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// CONFIGURAZIONE NEGOZI / LOCATION
// ======================================================

const LOCATIONS = {
  AMS01: {
    codice: "AMS01",
    nome: "Primo negozio",
    locationId: process.env.SHOPIFY_LOCATION_AMS01 || "",
    attivo: false,
  },

  AMS02: {
    codice: "AMS02",
    nome: "Negozio Amsterdam",
    locationId:
      process.env.SHOPIFY_LOCATION_AMS02 ||
      "gid://shopify/Location/115739591040",
    locationNumericId: "115739591040",
    attivo: true,
  },
};

// ======================================================
// TOKEN SHOPIFY
// ======================================================

let cachedShopifyToken = null;
let cachedShopifyTokenExpiresAt = 0;

async function getShopifyAccessToken() {
  const now = Date.now();

  if (cachedShopifyToken && now < cachedShopifyTokenExpiresAt) {
    return cachedShopifyToken;
  }

  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shop || !clientId || !clientSecret) {
    throw new Error(
      "Configurazione Shopify mancante. Verifica SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET."
    );
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error("Errore generazione token Shopify: " + text);
  }

  const data = JSON.parse(text);

  if (!data.access_token) {
    throw new Error("Shopify non ha restituito access_token: " + text);
  }

  cachedShopifyToken = data.access_token;

  const expiresInSeconds = data.expires_in || 3600;
  cachedShopifyTokenExpiresAt = Date.now() + (expiresInSeconds - 60) * 1000;

  return cachedShopifyToken;
}

// ======================================================
// CHIAMATA GRAPHQL SHOPIFY
// ======================================================

async function shopifyGraphql(query, variables) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2026-04";
  const token = await getShopifyAccessToken();

  const response = await fetch(
    `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error("Errore HTTP Shopify GraphQL: " + text);
  }

  const data = JSON.parse(text);

  if (data.errors) {
    throw new Error("Errore GraphQL Shopify: " + JSON.stringify(data.errors));
  }

  return data.data;
}

// ======================================================
// FUNZIONI UTILI
// ======================================================

function getQuantity(quantities, name) {
  const row = quantities.find((q) => q.name === name);
  return row ? Number(row.quantity || 0) : 0;
}

function getCodiceArticoloFromSku(sku) {
  if (!sku) return "";

  const cleanSku = String(sku).trim();

  if (cleanSku.includes("/")) {
    return cleanSku.split("/")[0];
  }

  return cleanSku;
}

function todayRangeForOrders() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

// ======================================================
// LAYOUT
// ======================================================

function layout(title, activePage, content) {
  const activeControllo = activePage === "controllo-scorte" ? "active" : "";
  const activeAltre = activePage === "altre-funzioni" ? "active" : "";

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f6f6f7;
      color: #202223;
    }

    ..page {
  max-width: 100%;
  margin: 0 auto;
  padding: 12px;
}

    .header {
      background: #ffffff;
      border: 1px solid #dfe3e8;
      border-radius: 12px;
      padding: 18px 22px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #dfe3e8;
    }

    .tab {
      display: inline-block;
      padding: 10px 14px;
      text-decoration: none;
      color: #5c5f62;
      font-weight: 600;
      border-bottom: 3px solid transparent;
    }

    .tab:hover {
      color: #202223;
    }

    .tab.active {
      color: #202223;
      border-bottom-color: #008060;
    }

    .card {
      background: #ffffff;
      border: 1px solid #dfe3e8;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 16px;
    }

    .card h1 {
      margin: 0 0 8px 0;
      font-size: 22px;
    }

    .card p {
      margin: 0 0 12px 0;
      color: #6d7175;
      line-height: 1.5;
    }

    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      margin: 16px 0;
    }

    input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #c9cccf;
      border-radius: 8px;
      font-size: 14px;
    }

    button {
      background: #ffffff;
      border: 1px solid #c9cccf;
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 14px;
    }

    button.primary {
      background: #008060;
      color: white;
      border-color: #008060;
    }

    .notice {
      background: #eaf5ea;
      border: 1px solid #95c996;
      color: #0b5c0b;
      padding: 12px 14px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .status {
      padding: 14px;
      color: #6d7175;
      font-size: 14px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid #dfe3e8;
      border-radius: 10px;
      margin-top: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      background: white;
    }

	th {
	  text-align: left;
	  background: #f6f6f7;
	  border-bottom: 1px solid #dfe3e8;
	  padding: 6px 4px;
	  font-weight: 600;
	  font-size: 10px;
	  color: #202223;
	  white-space: nowrap;
	  line-height: 1.15;
	}

    td {
  border-bottom: 1px solid #edf0f2;
  padding: 6px 4px;
  vertical-align: top;
  white-space: nowrap;
  font-size: 10.5px;
}

    td.num, th.num {
      text-align: right;
    }

    tr:hover {
      background: #fafbfb;
    }

    .badge {
  display: inline-block;
  background: #e4e5e7;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 10px;
}

    @media print {
      body {
        background: white;
      }

      .header,
      .toolbar {
        display: none;
      }

      .card {
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div class="title">Millesime ADD One</div>

      <div class="tabs">
        <a class="tab ${activeControllo}" href="/controllo-scorte">Controllo scorte</a>
        <a class="tab ${activeAltre}" href="/altre-funzioni">Altre funzioni</a>
      </div>
    </div>

    ${content}
  </div>
</body>
</html>
`;
}

// ======================================================
// PAGINE
// ======================================================

app.get("/", (req, res) => {
  res.redirect("/controllo-scorte");
});

app.get("/controllo-scorte", (req, res) => {
  res.send(
    layout(
      "Controllo scorte",
      "controllo-scorte",
      `
    <div class="card">
      <h1>Controllo scorte</h1>
      <p>
        Report scorte accorpato per codice articolo. Sono inclusi solo i prodotti con tag POS_ONLY.
      </p>

      <div class="toolbar">
        <input id="searchInput" type="text" placeholder="Cerca per codice articolo o prodotto..." />
        <button class="primary" onclick="loadData()">Aggiorna</button>
        <button onclick="window.print()">Stampa</button>
        <button onclick="exportCsv()">Esporta CSV</button>
      </div>

      <div id="status" class="status">Caricamento dati...</div>

      <div class="table-wrap">
        <table id="dataTable" style="display:none;">
          <thead>
            <tr>
			<th>Codice</th>
			<th>Prodotto</th>
			<th class="num">VARIANTI</th>
			<th class="num">AMS01<br>Venduti</th>
			<th class="num">AMS01<br>Disponibili</th>
			<th class="num">AMS01<br>Magazzino</th>
			<th class="num">AMS02<br>Venduti</th>
			<th class="num">AMS02<br>Disponibili</th>
			<th class="num">AMS02<br>Magazzino</th>
			<th class="num">VITULAZIO<br>Deposito</th>
            </tr>
          </thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>
    </div>

    <script>
      let allData = [];

      async function loadData() {
        const status = document.getElementById("status");
        const table = document.getElementById("dataTable");

        status.style.display = "block";
        status.textContent = "Caricamento dati da Shopify...";
        table.style.display = "none";

        try {
          const response = await fetch("/api/controllo-scorte");
          const json = await response.json();

          if (!json.success) {
            throw new Error(json.error || "Errore sconosciuto");
          }

          allData = json.data || [];
          renderTable();

	 	  status.textContent =
		    "Articoli: " + json.totalArticoli +
		    " | Varianti lette: " + json.totalVarianti +
		    " | Venduti AMS01 oggi: -" +
		    " | Venduti AMS02 oggi: " + json.totaleVendutiAMS02 +
		    " | Ultimo aggiornamento: " + new Date().toLocaleString();

          table.style.display = "table";
        } catch (err) {
          status.textContent = "Errore: " + err.message;
        }
      }

      function renderTable() {
        const search = document.getElementById("searchInput").value.toLowerCase().trim();
        const body = document.getElementById("tableBody");

        const filtered = allData.filter((row) => {
          return (
            row.codiceArticolo.toLowerCase().includes(search) ||
            row.prodotto.toLowerCase().includes(search)
          );
        });

        body.innerHTML = filtered.map((row) => {
          return \`
            <tr>
              <td><strong>\${row.codiceArticolo}</strong></td>
              <td>\${row.prodotto}</td>
              <td class="num"><span class="badge">\${row.varianti}</span></td>
			  <td class="num">\${row.ams01Venduti}</td>
  			  <td class="num">\${row.ams01Disponibili}</td>
			  <td class="num">\${row.ams01ADeposito}</td>
			  <td class="num">\${row.ams02Venduti}</td>
			  <td class="num">\${row.ams02Disponibili}</td>
   			  <td class="num">\${row.ams02ADeposito}</td>
			  <td class="num">\${row.depositoVitulazio}</td>
            </tr>
          \`;
        }).join("");
      }

      function exportCsv() {
        const rows = [
          [
            "Codice articolo",
            "Prodotto",
            "Varianti",
            "AMS01 venduti",
			"AMS01 disponibili",
			"AMS01 a deposito",
			"AMS02 venduti",
			"AMS02 disponibili",
			"AMS02 a deposito",
			"Deposito Vitulazio"
          ]
        ];

        allData.forEach((row) => {
          rows.push([
            row.codiceArticolo,
            row.prodotto,
            row.varianti,
			row.ams01Venduti,
			row.ams01Disponibili,
			row.ams01ADeposito,
			row.ams02Venduti,
			row.ams02Disponibili,
			row.ams02ADeposito,
			row.depositoVitulazio
          ]);
        });

        const csv = rows
          .map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(";"))
          .join("\\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "controllo-scorte.csv";
        a.click();

        URL.revokeObjectURL(url);
      }

      document.getElementById("searchInput").addEventListener("input", renderTable);
      loadData();
    </script>
  `
    )
  );
});

app.get("/altre-funzioni", (req, res) => {
  res.send(
    layout(
      "Altre funzioni",
      "altre-funzioni",
      `
    <div class="card">
      <h1>Altre funzioni</h1>
      <p>
        Area predisposta per barcode, inventario, log sincronizzazioni e strumenti futuri.
      </p>

      <div class="notice">
        Funzioni future da collegare.
      </div>
    </div>
  `
    )
  );
});

// ======================================================
// API CONTROLLO SCORTE
// ======================================================

app.get("/api/controllo-scorte", async (req, res) => {
  try {
    const location = LOCATIONS.AMS02;

    const inventoryRows = await readInventoryRowsAMS02(location);
    const soldMap = await readSoldTodayAMS02(inventoryRows.skuToCodiceMap);

    const groupedMap = new Map();

    for (const row of inventoryRows.rows) {
      if (!row.codiceArticolo) continue;

      if (!groupedMap.has(row.codiceArticolo)) {
		   groupedMap.set(row.codiceArticolo, {
 		   codiceArticolo: row.codiceArticolo,
		   prodotto: row.prodotto,
		   varianti: 0,
		   ams01Venduti: "-",
		   ams01Disponibili: "-",
		   ams01ADeposito: "-",
		   ams02Venduti: 0,
		   ams02Disponibili: 0,
		   ams02ADeposito: 0,
		   depositoVitulazio: 0,
		 });
      }

      const item = groupedMap.get(row.codiceArticolo);

	  item.varianti += 1;
	  item.ams02Disponibili += row.available;
	  item.ams02ADeposito += row.reserved;
	  item.depositoVitulazio = Math.max(item.depositoVitulazio, row.incoming);
    }

    for (const [codiceArticolo, qty] of soldMap.entries()) {
      if (!groupedMap.has(codiceArticolo)) {
        groupedMap.set(codiceArticolo, {
          codiceArticolo,
          prodotto: "",
          varianti: 0,
          ams01Venduti: "-",
          ams01Disponibili: "-",
          ams02Venduti: 0,
          ams02Disponibili: 0,
          depositoVitulazio: 0,
        });
      }

      groupedMap.get(codiceArticolo).ams02Venduti += qty;
    }

    const result = Array.from(groupedMap.values()).sort((a, b) =>
      a.codiceArticolo.localeCompare(b.codiceArticolo)
    );

    const totaleVendutiAMS02 = result.reduce(
      (sum, row) => sum + Number(row.ams02Venduti || 0),
      0
    );

    res.json({
      success: true,
      totalVarianti: inventoryRows.rows.length,
      totalArticoli: result.length,
      totaleVendutiAMS02,
      data: result,
    });
  } catch (err) {
    console.error("Errore /api/controllo-scorte:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ======================================================
// LETTURA INVENTARIO AMS02
// ======================================================

async function readInventoryRowsAMS02(location) {
  const query = `
    query ReadVariantsInventory($locationId: ID!, $cursor: String) {
      productVariants(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            sku
            barcode
            product {
              id
              title
              status
              tags
            }
            inventoryItem {
              id
              tracked
              inventoryLevel(locationId: $locationId) {
                id
				quantities(names: ["available", "incoming", "on_hand", "reserved"]) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  let hasNextPage = true;
  const rows = [];
  const skuToCodiceMap = new Map();

  while (hasNextPage) {
    const data = await shopifyGraphql(query, {
      locationId: location.locationId,
      cursor,
    });

    const productVariants = data.productVariants;

    for (const edge of productVariants.edges) {
      const v = edge.node;
      const productTags = v.product?.tags || [];

      if (!productTags.includes("POS_ONLY")) {
        continue;
      }

      const sku = v.sku || "";
      const codiceArticolo = getCodiceArticoloFromSku(sku);
      const quantities = v.inventoryItem?.inventoryLevel?.quantities || [];

      if (sku && codiceArticolo) {
        skuToCodiceMap.set(sku, codiceArticolo);
      }

      rows.push({
        codiceArticolo,
        skuCompleto: sku,
        prodotto: v.product?.title || "",
        statoProdotto: v.product?.status || "",
        variante: v.title || "",
        barcode: v.barcode || "",
        available: getQuantity(quantities, "available"),
        incoming: getQuantity(quantities, "incoming"),
        onHand: getQuantity(quantities, "on_hand"),
		reserved: getQuantity(quantities, "reserved"),
      });
    }

    hasNextPage = productVariants.pageInfo.hasNextPage;
    cursor = productVariants.pageInfo.endCursor;
  }

  return {
    rows,
    skuToCodiceMap,
  };
}

// ======================================================
// LETTURA VENDUTI AMS02 OGGI
// ======================================================

async function readSoldTodayAMS02(skuToCodiceMap) {
  const soldMap = new Map();
  const range = todayRangeForOrders();

  const ordersQuery =
    "created_at:>=" +
    range.startIso +
    " created_at:<" +
    range.endIso +
    " location_id:" +
    LOCATIONS.AMS02.locationNumericId;

  const query = `
    query ReadOrdersSoldToday($cursor: String, $ordersQuery: String!) {
      orders(first: 100, after: $cursor, query: $ordersQuery, sortKey: CREATED_AT) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            createdAt
            name
            lineItems(first: 100) {
              edges {
                node {
                  title
                  sku
                  quantity
                }
              }
            }
          }
        }
      }
    }
  `;

  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await shopifyGraphql(query, {
      cursor,
      ordersQuery,
    });

    const orders = data.orders;

    for (const edge of orders.edges) {
      const order = edge.node;

      for (const lineEdge of order.lineItems.edges) {
        const line = lineEdge.node;
        const sku = line.sku || "";

        if (!skuToCodiceMap.has(sku)) {
          continue;
        }

        const codiceArticolo = skuToCodiceMap.get(sku);
        const current = soldMap.get(codiceArticolo) || 0;

        soldMap.set(codiceArticolo, current + Number(line.quantity || 0));
      }
    }

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;
  }

  return soldMap;
}

// ======================================================
// HEALTH
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "millesime-add-one",
  });
});

app.listen(PORT, () => {
  console.log(`Millesime ADD One avviata sulla porta ${PORT}`);
});
