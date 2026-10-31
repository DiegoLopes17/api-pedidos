const pedidosService = require('../services/pedidos.service');

function criar(req, res) {
  const pedido = pedidosService.criarPedido(req.body);
  res.status(201).json(pedido);
}

function listar(req, res) {
  const pedidos = pedidosService.listarPedidos();
  res.status(200).json(pedidos);
}

function buscarPorId(req, res) {
  const pedido = pedidosService.buscarPedido(req.params.id);
  res.status(200).json(pedido);
}

function atualizarStatus(req, res) {
  const pedido = pedidosService.atualizarStatus(req.params.id, req.body);
  res.status(200).json(pedido);
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
