const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <h1>Millesime ADD One</h1>
    <p>Menu principale app Shopify.</p>

    <ul>
      <li><a href="/controllo-scorte">Controllo scorte</a></li>
      <li><a href="/altre-funzioni">Altre funzioni</a></li>
    </ul>
  `);
});

app.get("/controllo-scorte", (req, res) => {
  res.send(`
    <h1>Controllo scorte</h1>
    <p>Pagina provvisoria. Qui collegheremo la funzione già sviluppata per la disponibilità accorpata.</p>
    <p><a href="/">Torna al menu</a></p>
  `);
});

app.get("/altre-funzioni", (req, res) => {
  res.send(`
    <h1>Altre funzioni</h1>
    <p>Pagina provvisoria per funzioni future.</p>
    <p><a href="/">Torna al menu</a></p>
  `);
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