# Jules Orchestrator

[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-4.x-6E9F18?logo=vitest)](https://vitest.dev/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-✓-326CE5?logo=kubernetes)](https://kubernetes.io/)

Orquestrador de agentes de IA que gerencia tarefas de revisão de PRs, sessões de código, resolução de questões, autopilot e auto-healing. Projetado para rodar em jobs Kubernetes, utilizando modelos de linguagem (LLM) via Ollama e integração com GitHub API.

## Funcionalidades

- **Autopilot**: Execução automatizada de tarefas de codificação
- **Revisão de PRs**: Análise automatizada de pull requests
- **Sessões**: Gerenciamento de sessões de desenvolvimento com IA
- **Resolução de Questões**: Responder e resolver issues automaticamente
- **Self-Healing**: Auto-recuperação e diagnóstico do sistema
- **Product Owner**: Geração automatizada de tarefas e backlog
- **Relatórios Ops**: Relatórios operacionais do sistema

## Tech Stack

- **Runtime**: Node.js com TypeScript 6
- **Orquestração**: Kubernetes (jobs CRON)
- **IA**: Ollama (modelos locais) + Vercel AI SDK
- **API**: GitHub REST API (Octokit)
- **K8s**: @kubernetes/client-node
- **Validação**: Zod
- **Testes**: Vitest com coverage
- **Build**: tsc + tsx para desenvolvimento

## Início Rápido

```bash
pnpm install
cp .env.example .env  # Configure as variáveis
pnpm start            # Modo principal
pnpm start:autopilot  # Modo autopilot
pnpm test             # Rodar testes
```

## Variáveis de Ambiente

- `JOB_NAME` - Nome do job a executar (autopilot, create-sessions, etc.)
- `GITHUB_TOKEN` - Token de acesso ao GitHub
- Variáveis de conexão Ollama/configuração LLM

## Arquitetura

```
src/
  config/       # Configurações
  contracts/    # Interfaces/contratos
  jobs/         # Implementações dos jobs
  services/     # Serviços compartilhados
  utils/        # Utilitários
```
