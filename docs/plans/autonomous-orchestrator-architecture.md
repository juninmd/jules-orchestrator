# Arquitetura do Jules Orchestrator

## Direção

O projeto passa a ser tratado como uma plataforma operacional de jobs autônomos, não apenas como scripts pontuais. A fronteira principal fica em quatro camadas:

- `contracts`: tipos compartilhados de jobs, auditoria, análise e criação de issues.
- `services`: integrações e capacidades reutilizáveis, sempre com estado/auditoria explícitos.
- `jobs`: casos de uso executáveis por cron, CLI ou Kubernetes.
- `state`: arquivos JSONL/HTML gerados em `ORCHESTRATOR_STATE_DIR` para rastreabilidade sem exigir banco no primeiro momento.

## Funcionalidades adicionadas

- Auditoria local por execução: cada job gera `runId`, status, duração e erro quando falha.
- Eventos estruturados: serviços podem gravar eventos auditáveis em JSONL.
- Análise estática pré-IA: o scanner gera hotspots por arquivo antes de chamar Ollama.
- Relatório operacional: o job `ops-report` gera `ops-report.html` e `ops-report.json`.
- Contrato de criação de issue de roadmap: o GitHub Service passa a ter criação idempotente de issue por feature.
- Deploy simplificado: o workflow usa a action reutilizável `juninmd/base-actions/docker-build-push@main`.

## Decisões

1. Estado local antes de banco

   A aplicação roda como CronJob e precisa ser simples de operar em k3s. JSONL em volume persistente cobre auditoria, depuração e relatórios sem introduzir Postgres/Redis cedo demais.

2. Heurística antes de IA

   O LLM continua útil para síntese, mas recebe um relatório técnico determinístico com hotspots. Isso reduz custo, melhora repetibilidade e evita depender apenas de uma amostra curta de código.

3. Job de relatório em vez de servidor web

   O primeiro painel é um artefato HTML estático. Isso evita manter processo HTTP vivo em workloads que hoje são orientados a cron, mas já entrega visibilidade operacional.

## Próximos passos naturais

- Persistir `ORCHESTRATOR_STATE_DIR` em volume no chart do ArgoCD.
- Publicar o HTML como artifact ou em uma rota interna.
- Adicionar aprovação humana para ações de self-healing destrutivas.
- Evoluir o scanner para AST real por linguagem quando houver necessidade comprovada.
