let pedidos = [];
let proximoId = 1;

function criar(dados) {
  const pedido = { id: proximoId++, ...dados };
  pedidos.push(pedido);
  return { ...pedido };
}

function listar() {
  return pedidos.map((pedido) => ({ ...pedido }));
}

function buscarPorId(id) {
  const pedido = pedidos.find((item) => item.id === id);
  return pedido ? { ...pedido } : undefined;
}

function atualizarStatus(id, status) {
  const pedido = pedidos.find((item) => item.id === id);
  if (!pedido) return undefined;
  pedido.status = status;
  return { ...pedido };
}

function limpar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { criar, listar, buscarPorId, atualizarStatus, limpar };
