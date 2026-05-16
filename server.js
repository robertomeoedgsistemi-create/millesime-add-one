const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

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

    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
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
      padding: 24px;
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

    .notice {
      background: #eaf5ea;
      border: 1px solid #95c996;
      color: #0b5c0b;
      padding: 12px 14px;
      border-radius: 8px;
      margin-top: 16px;
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

app.get("/", (req, res) => {
  res.redirect("/controllo-scorte");
});

app.get("/controllo-scorte", (req, res) => {
  res.send(layout("Controllo scorte", "controllo-scorte", `
    <div class="card">
      <h1>Controllo scorte</h1>
      <p>
        Pagina provvisoria. Qui collegheremo la funzione già sviluppata per la disponibilità accorpata.
      </p>

      <div class="notice">
        Modulo in preparazione.
      </div>
    </div>
  `));
});

app.get("/altre-funzioni", (req, res) => {
  res.send(layout("Altre funzioni", "altre-funzioni", `
    <div class="card">
      <h1>Altre funzioni</h1>
      <p>
        Area predisposta per barcode, inventario, log sincronizzazioni e strumenti futuri.
      </p>

      <div class="notice">
        Funzioni future da collegare.
      </div>
    </div>
  `));
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "millesime-add-one"
  });
});

app.listen(PORT, () => {
  console.log(`Millesime ADD One avviata sulla porta ${PORT}`);
});