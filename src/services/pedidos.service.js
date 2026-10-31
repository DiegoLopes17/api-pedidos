const repositorio = require('../repositories/pedidos.repository');
const { validarNovoPedido, validarNovoStatus } = require('../validators/pedidos.validator');
const { STATUS_INICIAL, TRANSICOES } = require('../constants/pedidos');
const { NotFoundError, ValidationError } = require('../errors/AppError');

function converterId(id) {
  return /^\d+$/.test(id) ? Number(id) : null;
}

function criarPedido(corpo) {
  const dados = validarNovoPedido(corpo);
  return repositorio.criar({ ...dados, status: STATUS_INICIAL });
}

function listarPedidos() {
  return repositorio.listar();
}

function buscarPedido(id) {
  const pedido = repositorio.buscarPorId(converterId(id));

  if (!pedido) {
    throw new NotFoundError('Pedido não encontrado');
  }

  return pedido;
}

function atualizarStatus(id, corpo) {
  const pedido = buscarPedido(id);
  const novoStatus = validarNovoStatus(corpo);
  const permitidos = TRANSICOES[pedido.status];

  if (!permitidos.includes(novoStatus)) {
    const dica = permitidos.length > 0
      ? `transições permitidas a partir de "${pedido.status}": ${permitidos.join(', ')}`
      : `pedidos "${pedido.status}" não aceitam novas mudanças de status`;

    throw new ValidationError('Transição de status inválida', [
      `não é possível mudar de "${pedido.status}" para "${novoStatus}"`,
      dica,
    ]);
  }

  return repositorio.atualizarStatus(pedido.id, novoStatus);
}

module.exports = { criarPedido, listarPedidos, buscarPedido, atualizarStatus };
