# Deploy no Kubernetes

## Pré-requisitos

- Cluster com Ollama disponível (ex: `ollama.ollama.svc.cluster.local:11434`)
- Imagem publicada no GHCR via CI (push no `master` dispara o workflow)

## Ordem de aplicação

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/pvc.yaml

# Criar o Secret com valores reais (nunca commitar com valores preenchidos)
kubectl create secret generic jules-orchestrator-secrets \
  --namespace=jules-orchestrator \
  --from-literal=GITHUB_TOKEN=ghp_... \
  --from-literal=JULES_API_KEY=... \
  --from-literal=TELEGRAM_BOT_TOKEN=... \
  --from-literal=TELEGRAM_CHAT_ID=...

kubectl apply -f k8s/cronjob.yaml
```

## Disparo manual

```bash
kubectl create job --from=cronjob/jules-orchestrator jules-manual-$(date +%s) \
  -n jules-orchestrator
```

## Observabilidade

```bash
# Logs do último job
kubectl logs -n jules-orchestrator -l job-name --tail=200

# Relatório operacional (gerado em /data/orchestrator-state)
kubectl exec -n jules-orchestrator <pod> -- cat /data/orchestrator-state/ops-report.json
```

## RBAC

O ServiceAccount recebe apenas `list/get pods` e `get pods/log` — permissões mínimas
para o job `self-healing` detectar pods em CrashLoopBackOff com a annotation `source-repo`.

## Variáveis de ambiente

| Variável | Origem | Obrigatório |
|---|---|---|
| `GITHUB_TOKEN` | Secret | Sim |
| `JULES_API_KEY` | Secret | Sim (se JULES_API_URL definido) |
| `TELEGRAM_BOT_TOKEN` | Secret | Não |
| `TELEGRAM_CHAT_ID` | Secret | Não |
| `OLLAMA_HOST` | CronJob env | Sim |
| `OLLAMA_MODEL` | CronJob env | Sim |
| `TARGET_REPO` | CronJob env (opcional) | Não — usa todos os repos do token |
