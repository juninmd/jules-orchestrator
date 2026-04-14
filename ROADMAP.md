# 🗺️ Roadmap de Produto: Jules Orchestrator

Bem-vindo ao **Roadmap** do Jules Orchestrator! Este documento serve como guia contínuo de evolução, norteando nossas prioridades, documentando a visão de produto e detalhando as iniciativas técnicas que impulsionarão nossas aplicações.

---

## 🧭 Visão do Produto

Ser a plataforma definitiva de engenharia de software autônoma e orquestração de IA. O **Jules Orchestrator** não apenas reage a eventos, mas atua proativamente descobrindo débitos técnicos (SOLID/KISS/DRY), sugerindo melhorias, realizando revisões de código avançadas (Code Review), e aplicando capacidades de "Self-Healing" em ecossistemas de microsserviços.

---

## ⚙️ Estado Atual do Produto

Saímos da fase de "ideia poderosa" e entramos na fase de **productização operacional**. O foco imediato agora é garantir que o orquestrador rode bem como workload de cluster, sem comportamento repetitivo, sem acoplamentos frágeis de ambiente e com manifestos coerentes para o ArgoCD/k3s.

### Marco atual

- [x] Registro centralizado de jobs (`create-sessions`, `resolve-questions`, `review-prs`, `self-healing`)
- [x] Compatibilidade multiplataforma para workspaces temporários
- [x] Seleção explícita de repositórios alvo via `TARGET_REPO`
- [x] Dedupe de feedback em PRs para evitar spam do bot em execuções recorrentes
- [x] Docker de produção endurecido para execução real
- [x] Manifestos do `app-charts` atualizados com self-healing, pull secret e secrets opcionais

### Próximo gate de release

O próximo ciclo deve fechar a lacuna entre "job funcional" e "plataforma autônoma observável":

1. publicar pipeline de build/push da imagem para GHCR;
2. adicionar telemetria estruturada por execução e por repositório;
3. criar fluxo persistente de backlog/roadmap para geração de tasks com idempotência;
4. promover a autocura de "dispatch de análise" para "ação segura com rollback/control gate".

---

## 🔄 Como aprimoramos os repositórios?

Nosso fluxo de desenvolvimento e melhoria contínua é **orientado a tarefas (Task-Driven)** e integrado ao preenchimento de checklists. O ciclo funciona da seguinte maneira:

1. **Descoberta e Planejamento:** Novas ideias, necessidades arquiteturais ou débitos detectados pelo próprio agente são mapeados neste ROADMAP.
2. **Detalhamento Extremo:** Toda funcionalidade é quebrada em tarefas e subtarefas minunciosamente descritas com critérios de aceite bem definidos.
3. **Execução e Checklist:** Conforme o desenvolvimento avança, o checklist (`[ ]` -> `[x]`) de cada tarefa é marcado como concluído.
4. **Geração de Novas Features:** A conclusão de tarefas específicas serve como "gatilho" lógico. Este fluxo contínuo garante que, ao fechar um ciclo de melhoria, novas *tasks* de features subsequentes sejam automaticamente idealizadas e criadas, expandindo de forma autônoma o escopo da aplicação.

---

## 📌 Épicos e Features em Foco

Abaixo estão listadas as tarefas detalhadas. Marque-as conforme o desenvolvimento progredir para alimentar o ciclo de criação de novas funcionalidades.

### ÉPICO 0: Productização e Deploy no Cluster
*Focado em transformar o orquestrador em serviço confiável, publicável e operável no ArgoCD/k3s.*

- [x] **Feature: Endurecimento do Runtime Base**
  - **Descrição:** Consolidar registro de jobs, corrigir inconsistências de bootstrap, validar ambiente de forma previsível e remover dependências de paths Unix-only.
  - **Critérios de Aceite:**
    - [x] Centralizar a seleção do `JOB_NAME`.
    - [x] Permitir execução sem Jules quando a integração não estiver configurada.
    - [x] Tornar a seleção de repositórios explícita via `TARGET_REPO`.
    - [x] Garantir workspaces temporários compatíveis com Windows/Linux.

- [x] **Feature: Controle de Repetição no Revisor de PRs**
  - **Descrição:** Evitar comentários duplicados para o mesmo diff quando o cron de revisão rodar várias vezes sem alteração no PR.
  - **Critérios de Aceite:**
    - [x] Gerar fingerprint estável do diff revisado.
    - [x] Verificar comentários já existentes antes de build/review.
    - [x] Pular feedback repetido quando o mesmo diff já recebeu análise.

- [x] **Feature: Hardening de Deploy no app-charts**
  - **Descrição:** Fechar as lacunas do workload Kubernetes para o orquestrador subir com cronjobs coerentes, secrets opcionais e endurecimento básico de container.
  - **Critérios de Aceite:**
    - [x] Incluir `docker-pull-secret.yaml` no `kustomization.yaml`.
    - [x] Publicar cronjob de `self-healing`.
    - [x] Expor chaves opcionais de Telegram/Jules no `ExternalSecret`.
    - [x] Aplicar limites de recursos e `securityContext` nos jobs.

### ÉPICO 1: Aprimoramento da Análise de Repositórios e Criação de Sessões
*Focado na inteligência de como o orquestrador vasculha os repositórios à procura de débitos técnicos.*

- [ ] **Feature: Heurística Avançada de Análise Estática**
  - **Descrição:** Refatorar o `RepoAnalyzerService` para utilizar não apenas prompts de IA, mas também AST (Abstract Syntax Tree) das linguagens do repositório alvo.
  - **Critérios de Aceite:**
    - [ ] Integrar biblioteca de parsing AST para TypeScript e Python.
    - [ ] Identificar violações claras do Princípio de Responsabilidade Única (SRP).
    - [ ] Gerar relatório técnico estruturado antes de acionar a IA.
    - [ ] Criar testes unitários (mínimo 80% de cobertura) para a nova classe de heurísticas.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Métricas de Código em Tempo Real".

- [ ] **Feature: Dashboard de Métricas de Código em Tempo Real**
  - **Descrição:** Desenvolver uma interface visual integrada (dashboard) para exibir em tempo real as métricas extraídas pela heurística de análise estática e a saúde geral do código-fonte do repositório alvo.
  - **Critérios de Aceite:**
    - [ ] Criar um front-end leve (ex: React/Vue) ou estender o serviço atual para servir a página do dashboard.
    - [ ] Exibir gráficos de complexidade ciclomática, débitos técnicos identificados, e saúde do repositório por módulo/diretório.
    - [ ] Integrar com a base de dados onde as heurísticas salvam o relatório técnico estruturado.
    - [ ] Fornecer filtros por data, severidade do débito e status de correção.
    - [ ] Permitir a exportação dos relatórios (PDF/CSV) a partir da interface.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Alertas Automáticos de Degradação de Qualidade via Slack/Teams".

- [ ] **Feature: Otimização no Roteamento de IA (AI Router)**
  - **Descrição:** Melhorar o `AIRouterService` para selecionar o modelo de IA (ex: Claude, GPT-4, Llama) baseado na complexidade do problema detectado.
  - **Critérios de Aceite:**
    - [ ] Criar enumeração/tabela de pesos para diferentes tipos de débito técnico.
    - [ ] Implementar fallback caso o modelo primário falhe ou retorne timeout.
    - [ ] Registrar telemetria das escolhas do modelo no console/log.
    - [ ] Testes de integração simulando falha do provedor de IA.

### ÉPICO 2: Evolução do Revisor de Pull Requests (`review-prs`)
*Focado na assertividade, contexto e didática dos Code Reviews feitos pelo bot.*

- [ ] **Feature: Contextualização Profunda de PRs**
  - **Descrição:** Atualmente o revisor olha o diff isolado. A melhoria consiste em fazer o bot ler os arquivos importados pelo código modificado para entender o impacto global.
  - **Critérios de Aceite:**
    - [ ] Criar um serviço de "Dependency Graph" temporal.
    - [ ] Expandir o prompt do revisor para incluir assinaturas de métodos impactados.
    - [ ] Adicionar funcionalidade de aprovação automática de PRs triviais (ex: alteração apenas de documentação ou typos).
    - [ ] Validar cobertura de testes do repositório destino durante o review.

- [ ] **Feature: Detecção de Vulnerabilidades de Segurança (DevSecOps)**
  - **Descrição:** Incluir um passo de segurança durante a revisão do PR antes do feedback de arquitetura.
  - **Critérios de Aceite:**
    - [ ] Detectar chaves de API/Secrets em hardcode.
    - [ ] Verificar uso de pacotes npm/pip desatualizados e marcados como vulneráveis (integração com banco de dados de CVEs).
    - [ ] Adicionar seção "Security" no comentário gerado pelo bot no GitHub.

### ÉPICO 3: Capacidades de Self-Healing (Autocura)
*Foco na resiliência e correção autônoma de falhas em produção ou durante pipelines.*

- [ ] **Feature: Auto-Correção de Falhas de CI/CD**
  - **Descrição:** Quando o GitHub Actions falhar por um erro de lint ou tipagem, o orquestrador deve ler o log, criar um commit de correção e empurrar na branch do PR.
  - **Critérios de Aceite:**
    - [ ] Criar webhook listener ou job periódico para checar status de CI no Github.
    - [ ] Extrair `stderr` da action falha de forma assíncrona.
    - [ ] Instruir o agente IA a corrigir apenas o erro específico sem alterar a regra de negócios.
    - [ ] Aplicar diff e commitar usando o `GithubService`.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Interface Web para Aprovação de Self-Healing".

- [ ] **Feature: Interface Web para Aprovação de Self-Healing**
  - **Descrição:** Criar um painel de controle interativo onde os operadores humanos possam revisar e aprovar as ações de self-healing propostas pelo orquestrador antes que elas sejam efetivamente aplicadas em ambientes produtivos (ex: commits corretivos ou reboots de pods).
  - **Critérios de Aceite:**
    - [ ] Desenvolver a interface que exibe os logs de CI/CD falhos e o diff (patch) gerado pela IA.
    - [ ] Implementar botões de "Aprovar" e "Rejeitar" (com justificativa de rejeição para alimentar o loop de aprendizado).
    - [ ] Integrar com o motor de Self-Healing para que ele aguarde o status de aprovação em cenários configurados como "Approval Required".
    - [ ] Criar log de auditoria rastreável (quem aprovou, quando e qual foi o diff exato aplicado).
    - [ ] Adicionar autenticação básica (SSO/OAuth) para garantir que apenas pessoas autorizadas façam o controle.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Motor de Aprendizado Ativo: Retroalimentação a partir de Rejeições Humanas".

- [ ] **Feature: Integração com Monitoramento de Kubernetes**
  - **Descrição:** Expandir a funcionalidade de self-healing utilizando o `@kubernetes/client-node` já presente no `package.json` para reiniciar pods travados ou reverter deploys que disparam muitos erros 500.
  - **Critérios de Aceite:**
    - [ ] Configurar conexão segura com o cluster via KubeConfig/ServiceAccount.
    - [ ] Ler logs de pods que entraram no estado CrashLoopBackOff.
    - [ ] Disparar alerta via `TelegramService` com a análise da causa raiz gerada por IA.
    - [ ] Criar opção de "Revert Autônomo" baseado em limiares configuráveis.

### ÉPICO 4: Automação do Papel de Product Owner (P.O. Autônomo)
*Foco na gestão contínua de roadmap, priorização de backlog e criação dinâmica de novas tarefas a partir do progresso do desenvolvimento.*

- [x] **Feature: Parser Dinâmico de Checklists do ROADMAP**
  - **Descrição:** O orquestrador deve ler continuamente o estado do `ROADMAP.md` para monitorar a progressão (checklists marcados como `[x]`).
  - **Critérios de Aceite:**
    - [x] Criar um parser em Markdown (`RoadmapParserService`) focado na extração de estados de checklists.
    - [x] Implementar watcher/cron-job que detecte alterações e commits no arquivo de Roadmap.
    - [x] Identificar de forma autônoma quais tarefas foram recém-concluídas comparando com o histórico (git diff).
    - [x] Salvar o estado em um banco de dados leve ou arquivo persistente para garantir a idempotência e evitar ações duplicadas.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração do Parser de Roadmap com o Gerenciador de Issues do GitHub".

- [x] **Feature: Motor de Geração de Novas Features (Task Feedback Loop)**
  - **Descrição:** Uma vez detectado que uma tarefa com um "Gatilho" foi concluída, o orquestrador como P.O. autônomo deve gerar novas issues/tarefas subsequentes e atualizar o ROADMAP.
  - **Critérios de Aceite:**
    - [x] Criar prompt para o LLM atuar como Product Owner, capaz de pegar o contexto da tarefa concluída e o gatilho, e detalhar a nova feature.
    - [x] Auto-modificar o arquivo `ROADMAP.md` via pull request para injetar a nova feature nas seções apropriadas após revisão humana.
    - [x] Abrir uma Issue no repositório vinculando a nova feature do roadmap, já populada com Critérios de Aceite gerados pela IA.
    - [x] Implementar mecanismo de controle para evitar loops infinitos de geração de tarefas.

- [ ] **Feature: Integração do Parser de Roadmap com o Gerenciador de Issues do GitHub**
  - **Descrição:** Uma vez que o parser detectou mudanças e gerou uma nova task, o sistema precisa integrar-se diretamente com o GitHub para criar uma nova Issue oficial no repositório. Isso garante rastreabilidade e visibilidade para todos os desenvolvedores. A nova funcionalidade deve ser robusta o suficiente para mapear o conteúdo Markdown da feature para o formato suportado pelo GitHub, incluindo labels automáticos e designação de milestones se aplicável.
  - **Critérios de Aceite:**
    - [ ] Criar um método `createIssueFromFeature` no serviço `GithubService` usando o `@octokit/rest` configurado no projeto.
    - [ ] A Issue gerada deve conter a descrição detalhada e o checklist de critérios de aceite extraídos da geração via IA no corpo (`body`) da Issue.
    - [ ] O título da Issue deve seguir um padrão claro (e.g., "Feature: [Nome da Feature]").
    - [ ] Adicionar labels apropriados de forma automática, como `enhancement`, `AI-generated` e `autocreated`.
    - [ ] Antes de criar a Issue, consultar se já existe uma issue com título similar no repositório para evitar a duplicação de tarefas (`idempotência`).
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração Bidirecional: Sincronização de Status de Issues com o ROADMAP".

- [ ] **Feature: Integração Bidirecional: Sincronização de Status de Issues com o ROADMAP**
  - **Descrição:** Fazer com que o `ROADMAP.md` e o GitHub Issues operem em perfeita sincronia bidirecional. Quando uma Issue vinculada ao ROADMAP for fechada (via PR ou manualmente), o item do ROADMAP correspondente deve ter seu checklist automaticamente marcado como `[x]`, alimentando o ciclo sem necessidade de commit manual do desenvolvedor no arquivo Markdown.
  - **Critérios de Aceite:**
    - [ ] Criar listener de webhooks do GitHub escutando o evento `issues.closed` e `pull_request.closed` (merged).
    - [ ] Mapear o ID/Título da Issue fechada com a sua respectiva feature detalhada dentro do `ROADMAP.md`.
    - [ ] Modificar programaticamente o arquivo `ROADMAP.md`, alterando o `[ ]` para `[x]` na respectiva subtask ou feature principal.
    - [ ] Criar e realizar o merge automático do commit de atualização do ROADMAP via GitHub API de forma silenciosa e performática.
    - [ ] Testar cenários de edge cases (Issue reaberta, texto levemente alterado, falha na API de commit) e implementar tratamento de erros adequado.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Painel P.O. Visual: Geração de Relatório de Progresso de Sprint".

---

## 📝 Gestão do Documento e Próximos Passos

Como P.O., garantirei que:
- Este documento será revisado ao fim de cada ciclo (Sprint/Release).
- **A cada marcação de checklist concluída, o orquestrador ou a equipe de desenvolvimento deverá abrir uma Issue/Task correspondente à evolução natural do produto.**
- Qualquer membro da equipe pode sugerir novas Features neste Roadmap, desde que siga o formato de "Critérios de Aceite" e defina os potenciais "Gatilhos" para o ecossistema.

*Desenvolvido e orquestrado por Jules, com foco em excelência e evolução contínua.*
