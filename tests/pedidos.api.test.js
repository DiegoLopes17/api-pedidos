const request = require('supertest');
const app = require('../src/app');
const repositorio = require('../src/repositories/pedidos.repository');
const pedidosService = require('../src/services/pedidos.service');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  repositorio.limpar();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /pedidos', () => {
  test('cria pedido válido e responde 201 com o pedido criado', async () => {
    const resposta = await request(app).post('/pedidos').send(pedidoValido);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ id: 1, ...pedidoValido, status: 'recebido' });
  });

  test('responde 400 com mensagem explicativa para dados inválidos', async () => {
    const resposta = await request(app)
      .post('/pedidos')
      .send({ cliente: '   ', tipo: 'entrega', valor: -5, prioridade: 'normal' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Dados inválidos');
    expect(resposta.body.detalhes).toEqual([
      'cliente é obrigatório e não pode ser vazio',
      'valor deve ser numérico e maior que zero',
    ]);
  });

  test('responde 400 quando o corpo está vazio', async () => {
    const resposta = await request(app).post('/pedidos');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBeDefined();
  });

  test('responde 400 (e não 500) quando o JSON está malformado', async () => {
    const resposta = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": "Carlos"');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('JSON inválido');
  });
});

describe('GET /pedidos', () => {
  test('responde 200 com lista vazia quando não há pedidos', async () => {
    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  test('responde 200 com os pedidos cadastrados', async () => {
    await request(app).post('/pedidos').send(pedidoValido);
    await request(app).post('/pedidos').send({ ...pedidoValido, cliente: 'Ana Souza' });

    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body[1].cliente).toBe('Ana Souza');
  });
});

describe('GET /pedidos/:id', () => {
  test('responde 200 para pedido existente', async () => {
    await request(app).post('/pedidos').send(pedidoValido);

    const resposta = await request(app).get('/pedidos/1');

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(1);
  });

  test('responde 404 para id inexistente', async () => {
    const resposta = await request(app).get('/pedidos/999');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: 'Pedido não encontrado' });
  });

  test('responde 404 para id que não é número', async () => {
    const resposta = await request(app).get('/pedidos/abc');

    expect(resposta.status).toBe(404);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  beforeEach(async () => {
    await request(app).post('/pedidos').send(pedidoValido);
  });

  test('responde 200 com o pedido atualizado', async () => {
    const resposta = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('em_preparacao');
  });

  test('a mudança fica gravada para consultas seguintes', async () => {
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });

    const resposta = await request(app).get('/pedidos/1');

    expect(resposta.body.status).toBe('cancelado');
  });

  test('responde 400 para status desconhecido', async () => {
    const resposta = await request(app).patch('/pedidos/1/status').send({ status: 'voando' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Dados inválidos');
  });

  test('responde 400 para transição não permitida e explica o motivo', async () => {
    const resposta = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Transição de status inválida');
    expect(resposta.body.detalhes[0]).toContain('de "recebido" para "entregue"');
  });

  test('responde 404 para id inexistente', async () => {
    const resposta = await request(app).patch('/pedidos/999/status').send({ status: 'cancelado' });

    expect(resposta.status).toBe(404);
  });
});

describe('erros gerais', () => {
  test('rota inexistente responde 404 em JSON', async () => {
    const resposta = await request(app).get('/clientes');

    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({ erro: 'Rota não encontrada' });
  });

  test('erro inesperado responde 500 sem expor detalhes internos', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(pedidosService, 'listarPedidos').mockImplementation(() => {
      throw new Error('falha interna com dados sensíveis');
    });

    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({ erro: 'Erro interno do servidor' });
  });
});
