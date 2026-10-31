const TIPOS = ['entrega', 'retirada'];

const PRIORIDADES = ['baixa', 'normal', 'alta'];

const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

const STATUS_INICIAL = 'recebido';

const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

module.exports = { TIPOS, PRIORIDADES, STATUS, STATUS_INICIAL, TRANSICOES };
