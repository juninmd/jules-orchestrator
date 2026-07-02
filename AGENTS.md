# AGENTS.md - Jules Orchestrator

## Tech Stack
- **Language:** TypeScript 6.x
- **Runtime:** Node.js (ESM)
- **Package Manager:** pnpm
- **Testing:** Vitest 4.x with coverage
- **AI:** Vercel AI SDK + Ollama provider
- **APIs:** @octokit/rest (GitHub), @kubernetes/client-node
- **Validation:** Zod
- **CI:** GitHub Actions (dependabot, release-drafter)

## Project Structure
```
src/
  config/           # App configuration
  contracts/        # TypeScript interfaces/types
  jobs/             # Job implementations
    autopilot.ts
    create-sessions.ts
    resolve-questions.ts
    review-prs.ts
    product-owner.ts
    self-healing.ts
    ops-report.ts
  services/         # Shared services
  utils/            # Utilities
k8s/                # Kubernetes manifests
  cronjob.yaml
  namespace.yaml
  pvc.yaml
  rbac.yaml
  secret.yaml
```

## Build & Test
```bash
pnpm install
pnpm build          # tsc compilation
pnpm test           # vitest run
pnpm test:coverage  # with coverage
pnpm start          # tsx runner
```

## Environment Variables
- `JOB_NAME` - Job to execute
- `GITHUB_TOKEN` - GitHub API token
- `OLLAMA_API_KEY` - Ollama API key
- Various AI model config vars per .env.example
