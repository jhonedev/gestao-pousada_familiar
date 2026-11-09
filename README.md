# Pousada Vento Leste

Sistema de gestão de quartos e reservas. A interface é feita em React com Vite, e a API em Node.js usa o SQLite integrado ao Node.

## Como rodar

Instale o **Node.js 24 ou superior**, extraia o ZIP e abra um terminal na pasta `pousada-vento-leste`. Execute:

```sh
npm ci
npm start
```

Acesse [http://localhost:3000](http://localhost:3000). O comando `npm start` compila a interface e inicia a API no mesmo endereço. O painel foi configurado para uso local.

## Banco de dados

Na primeira execução, o servidor cria o arquivo `pousada.db` com as tabelas `quartos` e `reservas`. Os cadastros começam vazios e são preservados quando o servidor é reiniciado. O ZIP original veio sem arquivo de dados.

Se você tiver um `pousada.db` da versão anterior, coloque uma cópia dele na pasta do projeto antes de iniciar. Para importar um `db.json` da versão antiga, coloque-o na mesma pasta antes da primeira execução, quando ainda não existir `pousada.db`.

Para fazer backup, pare o servidor e guarde uma cópia de `pousada.db`.

## Uso

- **Dashboard** mostra os totais e as próximas chegadas.
- **Quartos** permite cadastrar, editar, filtrar e excluir quartos. Para excluir um quarto, remova primeiro as reservas associadas.
- **Reservas** permite cadastrar, editar, filtrar por quarto e excluir reservas. A API verifica a capacidade e os períodos sobrepostos e calcula o total a partir da diária e do número de noites. A saída de uma reserva pode coincidir com a entrada de outra.

## Desenvolvimento

Use `npm run api` em um terminal e `npm run dev` em outro. Abra o endereço exibido pelo Vite. Nesse modo, o Vite encaminha as chamadas de API para a porta 3000.

- `src/main.jsx` e `src/style.css` contêm a interface.
- `server.js` recebe as requisições HTTP e encaminha as operações para o serviço.

## Separação em três camadas

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Interface | `src/main.jsx` e `src/style.css` | Exibe as telas e os formulários e consome a API. |
| Serviço Web | `server.js` e `servico/pousada.js` | Recebe requisições, valida as regras de quartos e reservas e calcula o valor total. |
| Dados | `dados/repositorio.js` | Cria o banco SQLite, executa consultas e gravações e controla transações. |

Ao cadastrar uma reserva, o React envia uma requisição para `POST /api/reservas`.
O servidor encaminha a solicitação ao serviço, que verifica a capacidade e a sobreposição
com reservas existentes consultando o repositório. A validação e a gravação ocorrem na
mesma transação para impedir que duas solicitações concorrentes reservem o mesmo quarto
no mesmo período.