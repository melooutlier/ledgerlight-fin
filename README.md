# My Finance Hub

Crie uma aplicação web completa de gestão financeira pessoal chamada “Meu Financeiro”.

A aplicação será utilizada para controlar receitas, despesas, empréstimos e visualizar a situação financeira mensal do utilizador.

1. OBJETIVO DA APLICAÇÃO

Quero uma aplicação simples, moderna e intuitiva que me permita:

Registar entradas de dinheiro.

Registar despesas.

Categorizar despesas.

Consultar quanto gastei durante o mês.

Ver em que categorias estou a gastar mais.

Controlar o saldo disponível.

Registar dinheiro que emprestei a outras pessoas.

Registar dinheiro que “emprestei a mim mesmo”/adiantamentos pessoais.

Controlar valores que ainda tenho para receber.

Registar pagamentos parciais e totais de empréstimos.

Consultar histórico financeiro.

Filtrar informações por período, categoria e tipo de movimentação.

Ter uma visão clara da minha situação financeira.

A aplicação deve ser preparada para funcionar inicialmente como uma aplicação financeira pessoal, mas a arquitetura deve permitir adicionar autenticação e múltiplos utilizadores no futuro.

2. DESIGN

Quero um design:

Moderno

Minimalista

Profissional

Limpo

Responsivo

Mobile-first

Fácil de utilizar

Inspirar-se em aplicações modernas de gestão financeira.

Usar predominantemente:

Branco

Preto

Cinza

Um único tom de destaque para ações importantes.

Evitar excesso de cores, gradientes exagerados, sombras pesadas e elementos desnecessários.

A interface deve parecer uma aplicação financeira real, não um simples formulário.

3. DASHBOARD

Criar uma página inicial com um dashboard financeiro.

No topo mostrar:

Olá 👋

e o mês atualmente selecionado.

Criar cards para:

Saldo disponível

Valor calculado com base nas entradas e despesas.

Entradas

Total recebido no período selecionado.

Despesas

Total gasto no período selecionado.

A receber

Total de dinheiro emprestado a outras pessoas que ainda não foi devolvido.

Também mostrar:

Resumo financeiro

Um gráfico mostrando:

Entradas

Despesas

Saldo

Permitir alterar o período:

Este mês

Mês passado

Últimos 30 dias

Personalizado

4. DESPESAS

Criar uma página chamada Despesas.

Permitir adicionar uma nova despesa através de um botão:

+ Adicionar despesa

Campos:

Descrição

Valor

Data

Categoria

Método de pagamento

Observação

Categorias iniciais:

Alimentação

Transporte

Casa

Internet/Telefone

Roupas

Estudos

Trabalho

Negócio

Igreja

Lazer

Compras

Investimentos

Outros

Métodos de pagamento:

Dinheiro

M-Pesa

e-Mola

Conta bancária

Cartão

Outro

Mostrar as despesas numa tabela/lista:

Data | Descrição | Categoria | Método | Valor | Ações

Permitir:

Editar

Eliminar

Pesquisar

Filtrar

Ordenar

5. RECEITAS

Criar uma página Entradas.

Permitir registrar dinheiro recebido.

Campos:

Descrição

Valor

Data

Categoria

Método

Observação

Categorias:

Salário

Negócio

Freelance

Venda

Presente

Reembolso

Investimento

Outros

Mostrar histórico das entradas.

6. EMPRÉSTIMOS

Criar uma área específica chamada Empréstimos.

Esta área deve permitir controlar dinheiro que emprestei a outras pessoas.

Botão:

+ Novo empréstimo

Campos:

Nome da pessoa

Valor emprestado

Data do empréstimo

Data prevista para pagamento

Motivo

Observação

Depois de criar o empréstimo, mostrar:

Carlos

Valor emprestado: 2.000 MT
Pago: 500 MT
Pendente: 1.500 MT
Estado: Parcial

Estados possíveis:

Pendente

Parcial

Pago

Atrasado

Permitir registrar pagamentos.

Exemplo:

Empréstimo: 2.000 MT

Pagamento 1: 500 MT
Pagamento 2: 500 MT

Total pago: 1.000 MT

Restante: 1.000 MT

Quando o valor restante chegar a zero, alterar automaticamente o estado para:

Pago

Mostrar também um resumo:

Total emprestado

Total recebido

Total pendente

Empréstimos atrasados

7. “EMPRÉSTIMOS PARA MIM”

Criar também uma funcionalidade chamada Adiantamentos pessoais.

Esta funcionalidade serve para quando eu retiro dinheiro do meu próprio orçamento para uma finalidade específica e quero acompanhar esse valor separadamente.

Exemplo:

Tenho 10.000 MT.

Crio:

Adiantamento pessoal
Valor: 2.000 MT
Finalidade: Comprar equipamento

O sistema deve permitir acompanhar:

Valor inicial

Valor utilizado

Valor restante

Data

Finalidade

Observações

Importante:

Não tratar automaticamente um adiantamento pessoal como uma despesa.

O valor só deve aparecer como despesa quando eu registrar onde o dinheiro foi efetivamente utilizado.

8. CATEGORIAS

Criar uma página Categorias.

Permitir:

Criar categoria

Editar categoria

Eliminar categoria

Cada categoria deve permitir visualizar:

Total gasto

Número de transações

Também mostrar um resumo visual das categorias que mais consomem dinheiro.

9. ORÇAMENTO MENSAL

Criar uma funcionalidade chamada Orçamento.

Permitir definir um orçamento mensal geral.

Exemplo:

Orçamento mensal:

20.000 MT

Gastos:

13.500 MT

Restante:

6.500 MT

Também permitir criar limites por categoria.

Exemplo:

Alimentação:
Limite: 3.000 MT
Gasto: 2.450 MT
Restante: 550 MT

Quando uma categoria estiver próxima do limite, mostrar um aviso visual.

Quando ultrapassar o limite, indicar claramente:

Limite ultrapassado

Não bloquear o utilizador de continuar registrando despesas.

10. RELATÓRIOS

Criar página Relatórios.

Mostrar:

Resumo mensal

Total de entradas

Total de despesas

Saldo

Total emprestado

Total a receber

Gastos por categoria

Mostrar gráfico com distribuição dos gastos.

Evolução mensal

Mostrar quanto gastei nos últimos meses.

Maiores despesas

Mostrar as maiores despesas do período.

Permitir selecionar:

Mês

Ano

Categoria

11. HISTÓRICO

Criar uma página Movimentações onde todas as movimentações aparecem juntas.

Tipos:

Entrada

Despesa

Empréstimo

Pagamento de empréstimo

Adiantamento pessoal

Cada movimentação deve possuir:

Data

Tipo

Descrição

Valor

Categoria

Estado quando aplicável

Adicionar pesquisa e filtros.

12. REGRAS FINANCEIRAS

Implementar corretamente os cálculos.

Saldo

Saldo = Total de entradas - Total de despesas

Dinheiro emprestado a outras pessoas deve ser apresentado separadamente como:

Dinheiro a receber

Não considerar automaticamente dinheiro emprestado como uma despesa definitiva.

Quando uma pessoa devolver dinheiro:

Registrar o pagamento e atualizar o valor pendente.

13. ALERTAS

Criar alertas para:

Empréstimos próximos da data de pagamento

Empréstimos atrasados

Orçamento próximo do limite

Categoria acima do orçamento

Despesas muito superiores à média

Os alertas devem ser informativos e discretos.

14. NAVEGAÇÃO

Criar sidebar no desktop e navegação adaptada para mobile.

Menu:

Dashboard
Despesas
Entradas
Empréstimos
Adiantamentos
Orçamento
Relatórios
Categorias
Movimentações
Configurações

Adicionar botão destacado:

+ Nova movimentação

Ao clicar, permitir escolher:

Nova despesa

Nova entrada

Novo empréstimo

Novo adiantamento

15. MOEDA

Usar MZN / MT (Metical Moçambicano) em toda a aplicação.

Exemplo:

1.500 MT

Usar formatação adequada para valores monetários.

16. BANCO DE DADOS

Utilizar uma estrutura de dados organizada e preparada para crescimento.

Criar entidades/tabelas para:

users

transactions

categories

loans

loan_payments

personal_advances

budgets

budget_categories

Cada registro deve possuir:

ID

Data de criação

Data de atualização quando necessário

Preparar a aplicação para autenticação de utilizadores no futuro.

17. EXPERIÊNCIA DO UTILIZADOR

Quero que registrar uma despesa seja extremamente rápido.

O fluxo ideal:

Clicar em:

+ Nova movimentação

→ escolher Despesa

→ inserir valor

→ escolher categoria

→ guardar.

Depois de guardar:

Atualizar saldo automaticamente.

Atualizar total de despesas.

Atualizar gráfico.

Atualizar histórico.

Mostrar confirmação de sucesso.

Não recarregar a página desnecessariamente.

18. DADOS DE DEMONSTRAÇÃO

Adicionar alguns dados fictícios para que o dashboard não apareça vazio na primeira utilização.

Exemplo:

Entradas:

Salário — 15.000 MT
Negócio — 5.000 MT

Despesas:

Alimentação — 2.500 MT
Transporte — 1.200 MT
Internet — 500 MT
Negócio — 2.000 MT

Empréstimo:

Carlos — 2.000 MT
Pago — 500 MT
Pendente — 1.500 MT

Deixar claro que estes são dados de demonstração.

19. IMPORTANTE

Não criar uma interface excessivamente complexa.

Priorizar:

Clareza

Rapidez para registrar movimentações

Bons cálculos

Dashboard útil

Controle de empréstimos

Relatórios

Responsividade

Quero que a aplicação seja realmente utilizável no dia a dia.

Criar componentes reutilizáveis e uma estrutura de código limpa.

Se houver necessidade de escolher entre adicionar uma funcionalidade nova ou manter a aplicação simples, priorizar a simplicidade e a experiência do utilizador.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ledgerlight-fin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/62860276-885c-4222-b302-dcad1ecaf904).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
