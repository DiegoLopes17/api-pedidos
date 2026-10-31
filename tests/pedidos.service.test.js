const service = require('../src/services/pedidos.service');
const repositorio = require('../src/repositories/pedidos.repository');
const { ValidationError, NotFoundError } = require('../src/errors/AppError');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  repositorio.limpar();
});

describe('criarPedido', () => {
  test('cria pedido válido com id sequencial e status inicial "recebido"', () => {
    const primeiro = service.criarPedido(pedidoValido);
    const segundo = service.criarPedido(pedidoValido);

    expect(primeiro).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
    expect(segundo.id).toBe(2);
  });

  test('remove espaços nas extremidades do nome do cliente', () => {
    const pedido = service.criarPedido({ ...pedidoValido, cliente: '   Ana Souza  ' });

    expect(pedido.cliente).toBe('Ana Souza');
  });

  test.each([
    ['cliente ausente', { cliente: undefined }],
    ['cliente vazio', { cliente: '' }],
    ['cliente só com espaços', { cliente: '    ' }],
    ['cliente que não é texto', { cliente: 123 }],
    ['tipo desconhecido', { tipo: 'voador' }],
    ['tipo ausente', { tipo: undefined }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -10 }],
    ['valor em texto', { valor: '350' }],
    ['valor nulo', { valor: null }],
    ['prioridade desconhecida', { prioridade: 'urgentissima' }],
    ['prioridade ausente', { prioridade: undefined }],
  ])('rejeita %s', (_descricao, alteracao) => {
    expect(() => service.criarPedido({ ...pedidoValido, ...alteracao })).toThrow(ValidationError);
    expect(service.listarPedidos()).toHaveLength(0);
  });

  test.each([
    ['sem corpo', undefined],
    ['corpo nulo', null],
    ['corpo em lista', []],
    ['corpo em texto', 'pedido'],
  ])('rejeita requisição %s', (_descricao, corpo) => {
    expect(() => service.criarPedido(corpo)).toThrow(ValidationError);
  });

  test('reúne todos os erros encontrados em uma única resposta', () => {
    try {
      service.criarPedido({ cliente: ' ', tipo: 'x', valor: -1, prioridade: 'y' });
      throw new Error('deveria ter lançado ValidationError');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ValidationError);
      expect(erro.detalhes).toHaveLength(4);
    }
  });
});

describe('listarPedidos e buscarPedido', () => {
  test('lista vazia quando nada foi cadastrado', () => {
    expect(service.listarPedidos()).toEqual([]);
  });

  test('lista todos os pedidos cadastrados', () => {
    service.criarPedido(pedidoValido);
    service.criarPedido({ ...pedidoValido, cliente: 'Ana Souza' });

    expect(service.listarPedidos()).toHaveLength(2);
  });

  test('busca pedido existente pelo id', () => {
    service.criarPedido(pedidoValido);

    expect(service.buscarPedido('1').cliente).toBe('Carlos Silva');
  });

  test.each(['999', '0', 'abc', '1abc', '1.5', '-1'])('id "%s" inexistente lança NotFoundError', (id) => {
    service.criarPedido(pedidoValido);

    expect(() => service.buscarPedido(id)).toThrow(NotFoundError);
  });

  test('alterar o objeto retornado não altera o que está armazenado', () => {
    const criado = service.criarPedido(pedidoValido);
    criado.cliente = 'Outro Nome';

    expect(service.buscarPedido('1').cliente).toBe('Carlos Silva');
  });
});

describe('atualizarStatus', () => {
  beforeEach(() => {
    service.criarPedido(pedidoValido);
  });

  test('percorre o fluxo completo recebido -> entregue', () => {
    expect(service.atualizarStatus('1', { status: 'em_preparacao' }).status).toBe('em_preparacao');
    expect(service.atualizarStatus('1', { status: 'enviado' }).status).toBe('enviado');
    expect(service.atualizarStatus('1', { status: 'entregue' }).status).toBe('entregue');
  });

  test('permite cancelar um pedido recém-recebido', () => {
    expect(service.atualizarStatus('1', { status: 'cancelado' }).status).toBe('cancelado');
  });

  test('permite cancelar um pedido em preparação', () => {
    service.atualizarStatus('1', { status: 'em_preparacao' });

    expect(service.atualizarStatus('1', { status: 'cancelado' }).status).toBe('cancelado');
  });

  test('não permite pular etapas (recebido -> enviado)', () => {
    expect(() => service.atualizarStatus('1', { status: 'enviado' })).toThrow(ValidationError);
    expect(service.buscarPedido('1').status).toBe('recebido');
  });

  test('não permite repetir o status atual', () => {
    expect(() => service.atualizarStatus('1', { status: 'recebido' })).toThrow(ValidationError);
  });

  test('não permite cancelar depois de enviado', () => {
    service.atualizarStatus('1', { status: 'em_preparacao' });
    service.atualizarStatus('1', { status: 'enviado' });

    expect(() => service.atualizarStatus('1', { status: 'cancelado' })).toThrow(ValidationError);
  });

  test('pedido entregue é final e não aceita mudanças', () => {
    service.atualizarStatus('1', { status: 'em_preparacao' });
    service.atualizarStatus('1', { status: 'enviado' });
    service.atualizarStatus('1', { status: 'entregue' });

    expect(() => service.atualizarStatus('1', { status: 'recebido' })).toThrow(ValidationError);
  });

  test('pedido cancelado é final e não aceita mudanças', () => {
    service.atualizarStatus('1', { status: 'cancelado' });

    expect(() => service.atualizarStatus('1', { status: 'em_preparacao' })).toThrow(ValidationError);
  });

  test.each([
    ['status desconhecido', { status: 'voando' }],
    ['status ausente', {}],
    ['status que não é texto', { status: 5 }],
    ['sem corpo', undefined],
  ])('rejeita %s', (_descricao, corpo) => {
    expect(() => service.atualizarStatus('1', corpo)).toThrow(ValidationError);
  });

  test('id inexistente lança NotFoundError', () => {
    expect(() => service.atualizarStatus('99', { status: 'em_preparacao' })).toThrow(NotFoundError);
  });

  test('id inexistente tem prioridade sobre corpo inválido', () => {
    expect(() => service.atualizarStatus('99', { status: 'voando' })).toThrow(NotFoundError);
  });
});
