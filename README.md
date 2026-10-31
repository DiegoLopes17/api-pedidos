# API de Gerenciamento de Pedidos

Projeto prático avaliativo de Tópicos Avançados em Sistemas de Informação II.

É uma API REST feita com Node.js e Express para controlar os pedidos de uma pequena loja: dá para cadastrar um pedido, listar todos, consultar um pelo id e atualizar o status dele conforme ele avança (de `recebido` até `entregue`). Os dados ficam guardados em memória, então eles somem quando o servidor é reiniciado. O enunciado permite isso, e assim consegui focar no que mais importa aqui: separar bem as responsabilidades, validar as entradas, tratar os erros do jeito certo e testar o comportamento.

Autor: **DIEGO RAMOS LOPES**

## Como rodar

Precisa do Node.js 18 ou mais novo (eu usei a versão 22).

```bash
git clone <link-do-repositorio>
cd api-pedidos
npm install
npm start
```

A API sobe em `http://localhost:3000`. Para usar outra porta:

```bash
PORT=4000 npm start              # Linux, macOS ou Git Bash
$env:PORT=4000; npm start        # PowerShell
```

Para rodar os testes automatizados:

```bash
npm test
```

## Rotas

| Método | Rota | O que faz | Respostas |
|--------|------|-----------|-----------|
| POST | `/pedidos` | Cadastra um pedido | 201 criado, 400 dados inválidos |
| GET | `/pedidos` | Lista todos os pedidos | 200 |
| GET | `/pedidos/:id` | Consulta um pedido pelo id | 200 encontrado, 404 inexistente |
| PATCH | `/pedidos/:id/status` | Atualiza o status do pedido | 200 atualizado, 400 dados inválidos, 404 inexistente |

Qualquer outra rota responde 404 em JSON. Erros inesperados do servidor respondem 500.

### Exemplos

As respostas abaixo foram obtidas executando a API de verdade. Em PowerShell, use o Postman ou o Git Bash para os comandos `curl`.

**Cadastrar um pedido**

```bash
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"cliente":"Carlos Silva","tipo":"entrega","valor":350,"prioridade":"normal"}'
```

Resposta `201`:

```json
{
  "id": 1,
  "cliente": "Carlos Silva",
  "tipo": "entrega",
  "valor": 350,
  "prioridade": "normal",
  "status": "recebido"
}
```

**Cadastrar com dados inválidos**

```bash
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{"cliente":"   ","tipo":"voador","valor":-5,"prioridade":"normal"}'
```

Resposta `400`:

```json
{
  "erro": "Dados inválidos",
  "detalhes": [
    "cliente é obrigatório e não pode ser vazio",
    "tipo deve ser um destes valores: entrega, retirada",
    "valor deve ser numérico e maior que zero"
  ]
}
```

**Listar pedidos**

```bash
curl http://localhost:3000/pedidos
```

Resposta `200`: uma lista com os pedidos cadastrados (ou `[]` se não houver nenhum).

**Consultar um pedido**

```bash
curl http://localhost:3000/pedidos/1       # 200, devolve o pedido
curl http://localhost:3000/pedidos/999     # 404
```

Resposta `404`:

```json
{ "erro": "Pedido não encontrado" }
```

**Atualizar o status**

```bash
curl -X PATCH http://localhost:3000/pedidos/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"em_preparacao"}'
```

Resposta `200`: o pedido completo, já com `"status": "em_preparacao"`.

Se a mudança não for permitida (por exemplo, pular de `em_preparacao` direto para `entregue`), a resposta é `400`:

```json
{
  "erro": "Transição de status inválida",
  "detalhes": [
    "não é possível mudar de \"em_preparacao\" para \"entregue\"",
    "transições permitidas a partir de \"em_preparacao\": enviado, cancelado"
  ]
}
```

## Regras do sistema

### Valores aceitos

| Campo | Valores | Observação |
|-------|---------|------------|
| `cliente` | texto não vazio | espaços nas pontas são removidos antes de salvar |
| `tipo` | `entrega`, `retirada` | |
| `valor` | número maior que zero | precisa ser número no JSON; `"350"` (texto) é recusado |
| `prioridade` | `baixa`, `normal`, `alta` | |
| `status` | `recebido`, `em_preparacao`, `enviado`, `entregue`, `cancelado` | todo pedido nasce como `recebido` |

Os valores de `tipo`, `prioridade` e `status` precisam ser escritos exatamente assim, em minúsculas. Campos que não fazem parte do pedido (como um `status` enviado na criação) são ignorados.

### Transições de status

| Status atual | Pode ir para |
|--------------|--------------|
| `recebido` | `em_preparacao`, `cancelado` |
| `em_preparacao` | `enviado`, `cancelado` |
| `enviado` | `entregue` |
| `entregue` | nenhum (final) |
| `cancelado` | nenhum (final) |

A ideia é seguir o caminho natural de um pedido: ele não pula etapas, só pode ser cancelado antes de sair para entrega, e pedidos finalizados não mudam mais. Repetir o status atual também é recusado.

### Como os erros são tratados

- Toda resposta de erro é JSON, com o campo `erro` (resumo) e, quando faz sentido, `detalhes` (lista dos problemas encontrados). Na criação, todos os campos inválidos aparecem de uma vez, para o usuário corrigir tudo numa tentativa só.
- Erro do usuário vira 400 ou 404. Isso inclui um JSON mal formado no corpo da requisição.
- Qualquer erro que eu não previ vira 500 com a mensagem genérica `Erro interno do servidor`. O detalhe técnico vai só para o log do servidor e nunca para quem chamou a API.
- No `PATCH`, a ordem das verificações é: primeiro o id (404), depois o corpo (400) e por último a regra de transição (400). Um id que não é número, como `/pedidos/abc`, é tratado como pedido inexistente (404).

## Arquitetura

Usei **arquitetura em camadas**, com o padrão **Repository** para o armazenamento. É parecido com o MVC, só que sem a camada de visão, porque as respostas são JSON. Cada camada só conversa com a que está logo abaixo:

```
requisição -> routes -> controllers -> services -> repositories
                                           |
                                      validators
erros (em qualquer camada) -> middlewares/errorHandler -> resposta JSON
```

| Pasta | Responsabilidade |
|-------|------------------|
| `src/routes` | Liga método e URL a uma função do controller. Não tem lógica. |
| `src/controllers` | Lida com HTTP: lê `req`, chama o service e escolhe o código de status da resposta. Não conhece regra de negócio. |
| `src/services` | Regras de negócio: status inicial, transições permitidas, o que é um pedido inexistente. Não conhece `req` nem `res`. |
| `src/validators` | Confere o formato dos dados de entrada e devolve os dados já limpos. |
| `src/repositories` | Guarda os pedidos em memória e gera os ids. É o único lugar que sabe *onde* os dados ficam. |
| `src/errors` | Erros próprios (`ValidationError` = 400, `NotFoundError` = 404) que carregam o código HTTP. |
| `src/middlewares` | O tratamento global de erros, que transforma qualquer erro em resposta JSON. |
| `src/constants` | Tipos, prioridades, status e a tabela de transições, num lugar só. |

As pastas além das três mínimas (`routes`, `controllers`, `services`) existem por um motivo cada uma: `repositories` isola o armazenamento (trocar a memória por um banco mexeria só nela), `validators` evita misturar checagem de formato com regra de negócio, e `errors`, `middlewares` e `constants` evitam repetição.

### Estrutura do projeto

```
api-pedidos/
├── src/
│   ├── app.js                  monta o Express (JSON, rotas, erros)
│   ├── server.js               sobe o servidor na porta
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── validators/
│   ├── repositories/
│   ├── errors/
│   ├── middlewares/
│   └── constants/
├── tests/                      testes com Jest
├── postman/                    collection para importar no Postman
├── evidencias/                 capturas de tela do Postman
├── package.json
└── README.md
```

O `app.js` não chama `listen`; quem faz isso é o `server.js`. Essa separação permite que os testes usem o `app` sem abrir uma porta de verdade.

## Testes

### Automatizados (Jest)

```bash
npm test
```

São 59 testes, em dois arquivos:

- `tests/pedidos.service.test.js`: testa as regras de negócio direto no service, sem HTTP. Cobre criação válida, cada validação (cliente vazio ou só com espaços, valor zero, negativo ou em texto, tipo e prioridade desconhecidos), ids inexistentes, o fluxo completo de status, as transições proibidas e os estados finais.
- `tests/pedidos.api.test.js`: testa a API inteira com o Supertest e confere os códigos HTTP e o corpo das respostas: 201, 400, 200 e 404 de cada rota, JSON mal formado, rota inexistente e um erro inesperado simulado, que precisa virar 500 sem vazar detalhes.

Antes de cada teste o repositório é limpo, então um teste nunca depende do outro.

### Manuais (Postman)

1. Rode `npm start`.
2. No Postman, use **Import** e escolha `postman/api-pedidos.postman_collection.json`.
3. Com o servidor recém-iniciado, execute as requisições `01` a `05` em ordem. A pasta **Extras** tem outros cenários (transição inválida, status desconhecido, valor em texto).

### Evidências

A pasta `evidencias/` tem as capturas do Postman, cada uma mostrando método, URL, corpo enviado, resposta e código HTTP:

| Arquivo | Cenário |
|---------|---------|
| `01-criacao.png` | POST válido com resposta 201 |
| `02-validacao.png` | POST inválido com resposta 400 |
| `03-listagem.png` | GET da lista de pedidos |
| `04-consulta-inexistente.png` | GET de id inexistente com 404 |
| `05-atualizacao.png` | PATCH de status válido |

## Uso de IA

Usei IA como apoio neste projeto: o assistente Claude, da Anthropic.

**Para que usei:** para montar a estrutura inicial do projeto, escrever a primeira versão do código das camadas e dos testes, fazer o rascunho deste README e tirar dúvidas sobre as decisões. Depois disso, li o código, rodei os testes, fiz os testes manuais no Postman e ajustei o que precisei.

**Sugestões e o que fiz com elas:**

- **Aceita:** criar uma camada `repositories` além das três pedidas no enunciado. Aceitei porque ela deixa o service sem saber onde os dados ficam, e isso facilita testar e trocar a memória por um banco no futuro.
- **Aceita:** usar uma tabela de transições (`TRANSICOES`) em vez de vários `if` encadeados. Aceitei porque as regras ficam todas visíveis num lugar só e mudar uma regra é mudar uma linha.
- **Aceita:** responder 400 para uma transição de status proibida. O enunciado só prevê 200, 400 e 404 para essa rota, e uma transição proibida é um dado inválido para o estado atual do pedido.

## Limitações e próximos passos

- Os dados ficam em memória e se perdem ao reiniciar o servidor. O próximo passo natural é trocar o repositório por um banco de dados.
- Não há autenticação, nem paginação ou filtros na listagem.
- Não existe rota para editar os dados de um pedido nem para apagá-lo. O cancelamento é feito pelo status.
- `retirada` segue o mesmo fluxo de `entrega`, passando por `enviado`. Um fluxo próprio para retirada seria um bom refinamento.
