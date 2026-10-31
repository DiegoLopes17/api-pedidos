const app = require('./app');

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
  console.log(`API de pedidos rodando em http://localhost:${PORTA}`);
});
