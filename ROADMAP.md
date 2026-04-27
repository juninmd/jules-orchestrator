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
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Suporte Avançado a Múltiplos SOs nos Workspaces".

- [ ] **Feature: Suporte Avançado a Múltiplos SOs nos Workspaces**
  - **Descrição:** Para consolidar o endurecimento do runtime, devemos criar um serviço agnóstico que encapsule todas as interações com o File System de forma abstraída, permitindo a execução perfeita em macOS, Windows (WSL/nativo) e Linux, além de gerir montagens de volume temporários com cleanup automático.
  - **Critérios de Aceite:**
    - [ ] Criar a interface `IFileSystemManager` com abstrações para `createTempDir`, `cleanupTempDir`, `readFile`, `writeFile`.
    - [ ] Desenvolver a implementação `LocalFileSystemManager` garantindo que paths sejam formatados usando a API `path` nativa do Node em vez de hardcodes.
    - [ ] Criar um mecanismo de garbage collection para garantir a limpeza de arquivos temporários, mesmo em falhas não tratadas (ex. interceptar sinais SIGINT, SIGTERM).
    - [ ] Escrever testes unitários que garantam o comportamento compatível multi-OS.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Mapeamento Seguro de Workspaces Efêmeros em Clusters Kubernetes".

- [x] **Feature: Controle de Repetição no Revisor de PRs**
  - **Descrição:** Evitar comentários duplicados para o mesmo diff quando o cron de revisão rodar várias vezes sem alteração no PR.
  - **Critérios de Aceite:**
    - [x] Gerar fingerprint estável do diff revisado.
    - [x] Verificar comentários já existentes antes de build/review.
    - [x] Pular feedback repetido quando o mesmo diff já recebeu análise.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Resumo Agrupado Diário de Feedbacks Repetitivos de PRs".

- [ ] **Feature: Resumo Agrupado Diário de Feedbacks Repetitivos de PRs**
  - **Descrição:** Tendo resolvido a questão de duplicidade nos comentários isolados, precisamos agregar estatísticas. O orquestrador vai criar e notificar os engenheiros com relatórios diários de quais débitos estão sendo os mais detectados, atuando como um coach de qualidade de código.
  - **Critérios de Aceite:**
    - [ ] Armazenar de forma leve (SQLite ou logs indexados) os eventos de detecção de erros/feedbacks que foram deixados nos PRs durante as últimas 24h.
    - [ ] Processar esses eventos criando um ranking de erros mais frequentes (ex. "Tipagem Fraca", "Code Smell: SRP").
    - [ ] Gerar uma mensagem sumarizada (via IA) focada em educação do time e não punição.
    - [ ] Enviar notificação automatizada ao time via serviço de Telegram existente (ou nova integração).
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Criação de Tech Talks Dinâmicos com base em Débitos Frequentes".

- [x] **Feature: Hardening de Deploy no app-charts**
  - **Descrição:** Fechar as lacunas do workload Kubernetes para o orquestrador subir com cronjobs coerentes, secrets opcionais e endurecimento básico de container.
  - **Critérios de Aceite:**
    - [x] Incluir `docker-pull-secret.yaml` no `kustomization.yaml`.
    - [x] Publicar cronjob de `self-healing`.
    - [x] Expor chaves opcionais de Telegram/Jules no `ExternalSecret`.
    - [x] Aplicar limites de recursos e `securityContext` nos jobs.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Monitoramento Dinâmico de Consumo e Escalonamento dos CronJobs".

- [ ] **Feature: Monitoramento Dinâmico de Consumo e Escalonamento dos CronJobs**
  - **Descrição:** Após o hardening no ambiente, o próximo passo lógico é observar ativamente o uso. Essa feature envolve integrar o prometheus/grafana ou um agent de APM dentro do deployment para escalar recursos de acordo com a fila de repos ou PRs pendentes.
  - **Critérios de Aceite:**
    - [ ] Expor o endpoint `/metrics` utilizando a lib `prom-client` do Node.
    - [ ] Registrar métricas de duração de jobs, número de chamadas em falha e número de repositórios processados por execução.
    - [ ] Adicionar um ServiceMonitor no Helm/Kustomize do Kubernetes para raspagem automática pelo Prometheus.
    - [ ] Implementar política de alerta no Alertmanager para interrupções sucessivas nos jobs (ex: "Job self-healing falhando mais de 3 vezes em 1h").
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Visualização Centralizada de Custo e Performance de Agentes IA".

- [ ] **Feature: Visualização Centralizada de Custo e Performance de Agentes IA**
  - **Descrição:** Criação de um painel integrado para acompanhamento do consumo de infraestrutura (CPU/Memória) e da performance dos agentes IA. Este painel trará visibilidade gerencial sobre os custos operacionais.
  - **Critérios de Aceite:**
    - [ ] Criar a interface visual do painel com gráficos de tendências de consumo de recursos.
    - [ ] Integrar fontes de dados do Prometheus ou APM configurado no cluster.
    - [ ] Permitir filtragem por agente, job ou repositório alvo.
    - [ ] Exportar relatórios diários ou semanais em PDF ou CSV com resumo de custos.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração do Painel de Custos com Sistemas de Faturamento Externos".

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
    - [ ] Exibir gráficos de complexidade ciclomática, débitos técnicos identificados e saúde do repositório por módulo/diretório.
    - [ ] Integrar com a base de dados onde as heurísticas salvam o relatório técnico estruturado.
    - [ ] Fornecer filtros por data, severidade do débito e status de correção.
    - [ ] Permitir a exportação dos relatórios (PDF/CSV) a partir da interface.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Alertas Automáticos de Degradação de Qualidade via Slack/Teams".

- [ ] **Feature: Alertas Automáticos de Degradação de Qualidade via Slack/Teams**
  - **Descrição:** Notificar a equipe de forma proativa quando a saúde do repositório cair abaixo de um limiar configurável, ou quando débitos técnicos críticos (ex: alta complexidade ciclomática, quebra clara de SRP) forem detectados na pipeline.
  - **Critérios de Aceite:**
    - [ ] Integrar webhook/app do Slack e Microsoft Teams usando a API oficial.
    - [ ] Criar template de mensagem rica (blocos/cards) com o sumário do débito técnico encontrado e links diretos para o dashboard.
    - [ ] Adicionar mecanismo de "Snooze" ou "Acknowledge" (Reconhecer) via bot actions para silenciar o alerta de um débito específico temporariamente.
    - [ ] O alerta só deve disparar uma vez por detecção e apenas se o status do débito não for resolvido em um prazo configurável (ex: 2 dias).
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração de Métricas de Qualidade em Comentários Automáticos de Pull Requests".

- [ ] **Feature: Otimização no Roteamento de IA (AI Router)**
  - **Descrição:** Melhorar o `AIRouterService` para selecionar o modelo de IA (ex: Claude, GPT-4, Llama) baseado na complexidade do problema detectado.
  - **Critérios de Aceite:**
    - [ ] Criar enumeração/tabela de pesos para diferentes tipos de débito técnico.
    - [ ] Implementar fallback caso o modelo primário falhe ou retorne timeout.
    - [ ] Registrar telemetria das escolhas do modelo no console/log.
    - [ ] Testes de integração simulando falha do provedor de IA.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Monitoramento de Custos e Roteamento de IA".

- [ ] **Feature: Dashboard de Monitoramento de Custos e Roteamento de IA**
  - **Descrição:** Desenvolver uma visão unificada para monitorar o roteamento de tarefas entre os diferentes provedores de IA, bem como a alocação de custos por modelo, permitindo a gestão orçamentária preditiva.
  - **Critérios de Aceite:**
    - [ ] Coletar e consolidar métricas de roteamento no `AIRouterService`.
    - [ ] Criar a interface front-end ou painel CLI para exibir a proporção de uso (ex: GPT-4 vs Llama).
    - [ ] Adicionar cálculo estimado de custo em tempo real, baseando-se no número de tokens e tarifa por modelo.
    - [ ] Implementar sistema de alertas orçamentários (ex: disparar evento via webhook ao atingir 80% da quota).
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Implementação de Quotas Dinâmicas de Tokens por Projeto/Repo".

### ÉPICO 2: Evolução do Revisor de Pull Requests (`review-prs`)
*Focado na assertividade, contexto e didática dos Code Reviews feitos pelo bot.*

- [ ] **Feature: Contextualização Profunda de PRs**
  - **Descrição:** Atualmente o revisor olha o diff isolado. A melhoria consiste em fazer o bot ler os arquivos importados pelo código modificado para entender o impacto global.
  - **Critérios de Aceite:**
    - [ ] Criar um serviço de "Dependency Graph" temporal.
    - [ ] Expandir o prompt do revisor para incluir assinaturas de métodos impactados.
    - [ ] Adicionar funcionalidade de aprovação automática de PRs triviais (ex: alteração apenas de documentação ou typos).
    - [ ] Validar cobertura de testes do repositório destino durante o review.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Sugestão Autônoma de Refatoração baseada no Dependency Graph".

- [ ] **Feature: Sugestão Autônoma de Refatoração baseada no Dependency Graph**
  - **Descrição:** Usando o contexto expandido do Dependency Graph, a IA deverá não só avaliar o código alterado, mas também gerar um patch de código sugerindo como refatorar os componentes acoplados que dependem da modificação.
  - **Critérios de Aceite:**
    - [ ] Ampliar o prompt de IA com todo o contexto do nó afetado no Dependency Graph e seus dependentes diretos.
    - [ ] Se uma mudança de assinatura ocorrer, sugerir automaticamente os diffs de atualização nas chamadas de funções nos arquivos acoplados.
    - [ ] Incluir sugestões formatadas em code blocks executáveis do GitHub (`suggestion`) nos comentários do PR.
    - [ ] Medir a taxa de aceitação (Hit-Rate) das sugestões pelos desenvolvedores para realimentação.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Execução Automática em Sandbox das Sugestões de Refatoração".

- [ ] **Feature: Detecção de Vulnerabilidades de Segurança (DevSecOps)**
  - **Descrição:** Incluir um passo de segurança durante a revisão do PR antes do feedback de arquitetura.
  - **Critérios de Aceite:**
    - [ ] Detectar chaves de API/Secrets em hardcode.
    - [ ] Verificar uso de pacotes npm/pip desatualizados e marcados como vulneráveis (integração com banco de dados de CVEs).
    - [ ] Adicionar seção "Security" no comentário gerado pelo bot no GitHub.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Criação de PRs Automáticos para Correção de Dependências Vulneráveis".

- [ ] **Feature: Criação de PRs Automáticos para Correção de Dependências Vulneráveis**
  - **Descrição:** Evoluir a detecção de vulnerabilidades permitindo que o orquestrador não apenas alerte, mas crie automaticamente um Pull Request para atualizar a dependência afetada para uma versão segura (similar ao Dependabot, porém com capacidades de análise de quebra de contrato e refatoração).
  - **Critérios de Aceite:**
    - [ ] Analisar as notas de lançamento e changelogs da dependência afetada usando IA para identificar "Breaking Changes".
    - [ ] Criar o PR de atualização da versão vulnerável isoladamente.
    - [ ] Se houver breaking changes, aplicar diffs de atualização no código do repositório para contornar a quebra de compatibilidade.
    - [ ] Aguardar resultados da CI; se a CI falhar, tentar uma auto-correção iterativa.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Gestão de Risco e Saúde de Dependências de Terceiros".

- [ ] **Feature: Dashboard de Gestão de Risco e Saúde de Dependências de Terceiros**
  - **Descrição:** Criação de um painel focado em segurança da informação (SecOps) para reportar o status e a saúde de todas as bibliotecas de terceiros gerenciadas nos repositórios, consolidando o risco das dependências.
  - **Critérios de Aceite:**
    - [ ] Mapear as vulnerabilidades detectadas nas esteiras de Code Review (PRs) para uma base de dados centralizada.
    - [ ] Implementar interface visual que exibe as dependências desatualizadas, classificadas por severidade (Baixa, Média, Alta, Crítica).
    - [ ] Adicionar um Score de Saúde de Dependências por repositório.
    - [ ] Expor opções na interface para forçar um "auto-update PR" gerado pelo orquestrador nas dependências mais críticas.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração do Dashboard de Risco com Plataformas de SIEM".

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
    - [ ] Adicionar um mecanismo de autenticação (SSO/OAuth) para garantir que apenas pessoas autorizadas façam o controle.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Motor de Aprendizado Ativo: Retroalimentação a partir de Rejeições Humanas".

- [ ] **Feature: Motor de Aprendizado Ativo: Retroalimentação a partir de Rejeições Humanas**
  - **Descrição:** Implementar um loop de aprendizado contínuo onde as rejeições humanas no painel de Self-Healing sejam capturadas, contextualizadas e armazenadas em um banco vetorial para melhorar a qualidade dos patches futuros propostos pelo modelo.
  - **Critérios de Aceite:**
    - [ ] Interceptar o payload de "Rejeição" com o texto da justificativa inserida pelo operador humano.
    - [ ] Processar o contexto do problema, a solução falha da IA e a justificativa humana, gerando um documento de "Lição Aprendida" em banco vetorial (Embeddings).
    - [ ] Modificar o prompt do Self-Healing para buscar e incluir essas "Lições Aprendidas" do histórico antes de propor um novo patch.
    - [ ] Reportar evolução da métrica de aceitação vs. rejeição dos patches propostos.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Geração Autônoma de Testes Unitários de Regressão após Aplicação de Self-Healing".

- [ ] **Feature: Integração com Monitoramento de Kubernetes**
  - **Descrição:** Expandir a funcionalidade de self-healing utilizando o `@kubernetes/client-node` já presente no `package.json` para reiniciar pods travados ou reverter deploys que disparam muitos erros 500.
  - **Critérios de Aceite:**
    - [ ] Configurar conexão segura com o cluster via KubeConfig/ServiceAccount.
    - [ ] Ler logs de pods que entraram no estado CrashLoopBackOff.
    - [ ] Disparar alerta via `TelegramService` com a análise da causa raiz gerada por IA.
    - [ ] Criar opção de "Revert Autônomo" baseado em limiares configuráveis.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Eventos de Self-Healing e Resiliência do Cluster".

- [ ] **Feature: Dashboard de Eventos de Self-Healing e Resiliência do Cluster**
  - **Descrição:** Uma interface de observabilidade para acompanhar em tempo real as anomalias detectadas no cluster, os pods afetados, e as intervenções autônomas executadas (ex: reboots de pod, rollbacks), permitindo visualizar a métrica de "Tempo de Indisponibilidade Evitado".
  - **Critérios de Aceite:**
    - [ ] Exibir timeline histórica dos eventos de crash e intervenções executadas no cluster Kubernetes.
    - [ ] Mostrar gráficos de resiliência (quantidade de interações manuais vs. interações autônomas).
    - [ ] Listar o log de anomalia, o prompt enviado ao modelo de IA e a conclusão recebida.
    - [ ] Incluir filtros por namespace, label de deployment e tipo de intervenção.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Agendamento Inteligente de Manutenção Preventiva baseado em Histórico de Anomalias".

- [ ] **Feature: Agendamento Inteligente de Manutenção Preventiva baseado em Histórico de Anomalias**
  - **Descrição:** Evoluir a capacidade reativa de Self-Healing para um modelo proativo. O orquestrador analisará o padrão temporal das anomalias passadas (ex: sobrecarga de memória aos finais de semana) e agendará janelas de manutenção preventivas ou scale-ups antecipados.
  - **Critérios de Aceite:**
    - [ ] Processar o histórico de anomalias do Dashboard de Self-Healing para extrair sazonalidades e padrões de degradação.
    - [ ] Criar um mecanismo de CRON dinâmico (`MaintenanceScheduler`) que propõe e agenda ações preventivas.
    - [ ] Implementar integração com o Slack/Teams para notificar o time sobre a janela de manutenção planejada de forma autônoma.
    - [ ] Medir e reportar o impacto das manutenções preventivas na redução de indisponibilidades repentinas.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Orquestração Autônoma de Chaos Engineering Controlado".

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
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Melhoria do Prompt P.O. com Base de Conhecimento Vetorial".

- [ ] **Feature: Melhoria do Prompt P.O. com Base de Conhecimento Vetorial**
  - **Descrição:** O motor de geração atual utiliza um prompt fixo e depende exclusivamente do título e descrição da task anterior. Para aprimorar a profundidade e relevância das novas features criadas, introduziremos uma camada de RAG (Retrieval-Augmented Generation) integrando uma base de dados vetorial de histórico de projetos e boas práticas.
  - **Critérios de Aceite:**
    - [ ] Integrar a biblioteca de client para banco vetorial (ex. Milvus ou Qdrant).
    - [ ] Modificar o `POService` para realizar buscas na base vetorial utilizando embeddings do gatilho e do contexto da tarefa concluída.
    - [ ] Ajustar o prompt de geração para injetar até três "lições aprendidas" ou "boas práticas similares" recuperadas da busca vetorial.
    - [ ] Testar a consistência dos resultados gerados (com IA usando temperatura baixa) e criar suite de testes isolada para o novo método enriquecido do `POService`.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Interface de Administração do Conhecimento P.O.".

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
    - [ ] Realizar o commit automático de atualização do ROADMAP via GitHub API de forma silenciosa e performática.
    - [ ] Testar cenários de edge cases (Issue reaberta, texto levemente alterado, falha na API de commit) e implementar tratamento de erros adequado.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Painel P.O. Visual: Geração de Relatório de Progresso de Sprint".

- [ ] **Feature: Painel P.O. Visual: Geração de Relatório de Progresso de Sprint**
  - **Descrição:** Oferecer uma visão rica e gamificada do progresso do time em relação ao Roadmap estabelecido, calculando métricas de velocidade de entrega e burndown de forma completamente autônoma, mapeado pelo estado dos check-lists e issues conectadas.
  - **Critérios de Aceite:**
    - [ ] Criar interface visual listando épicos, progresso em % e status do checklist do `ROADMAP.md`.
    - [ ] Calcular velocidade de resolução de épicos baseando-se no timestamp das issues fechadas no GitHub.
    - [ ] Implementar motor de sugestão de escopo: A IA atua como P.O. alertando se o fluxo atual não é viável para uma data alvo predefinida, sugerindo reordenar prioridades.
    - [ ] Exportação do relatório visual (Sprint Review em PDF) utilizando IA generativa para sumarizar as maiores entregas em uma linguagem executiva.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Criação de Dailies Assíncronas Automáticas com Resumos de Gargalos".

- [ ] **Feature: Criação de Dailies Assíncronas Automáticas com Resumos de Gargalos**
  - **Descrição:** Como P.O., o orquestrador deve compilar o status de andamento das tarefas ativas e identificar desenvolvedores possivelmente bloqueados. O sistema publicará resumos diários ("Dailies") assíncronos nos canais de comunicação com insights para destravar gargalos.
  - **Critérios de Aceite:**
    - [ ] Mapear tempo de inatividade das branches e status das issues vinculadas ao ROADMAP atual.
    - [ ] Compilar um resumo em linguagem natural usando LLM sobre o andamento e os prováveis bloqueadores.
    - [ ] Publicar a "Daily Assíncrona" via integração com Slack ou Discord no início do dia útil.
    - [ ] Permitir que engenheiros interajam com a mensagem para solicitar sessões de pairing ou IA para destravamento.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Retrospectiva de Sprint Autônoma e Sugestão de Melhoria Contínua".

### ÉPICO 5: Engenharia de Prompt e Otimização de Custos de IA
*Foco em tornar as chamadas de LLMs mais baratas, rápidas e consistentes.*

- [ ] **Feature: Sistema de Cache Semântico de Respostas de IA**
  - **Descrição:** Implementar uma camada de cache vetorial para armazenar as respostas a perguntas comuns ou reviews de trechos de código idênticos, reduzindo o custo das chamadas de API e acelerando os tempos de resposta do orquestrador.
  - **Critérios de Aceite:**
    - [ ] Integrar um banco de dados vetorial leve ou em memória (ex: Chroma, Redisearch) para armazenar os embeddings dos prompts gerados.
    - [ ] Criar mecanismo de similaridade por cosseno que retorne a resposta em cache caso um novo prompt atinja 95% de similaridade semântica.
    - [ ] Desenvolver fallback suave (graceful degradation): caso o cache caia, o sistema continua roteando requisições para a IA normalmente.
    - [ ] Adicionar testes de unidade que validem a recuperação do cache para prompts repetidos com pequenas variações.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Painel de Métricas de Economia de Tokens e Hit-Rate do Cache".

- [ ] **Feature: Painel de Métricas de Economia de Tokens e Hit-Rate do Cache**
  - **Descrição:** Um dashboard voltado para a engenharia de custos para visualizar a eficiência do cache semântico de respostas.
  - **Critérios de Aceite:**
    - [ ] Monitorar tempo de resposta e economia em número de tokens não gastos nas APIs de LLM.
    - [ ] Exibir relatórios gráficos mensais do impacto financeiro do cache de embeddings vs. custo sem cache.
    - [ ] Fornecer interface de invalidação manual de entradas de cache problemáticas ou desatualizadas.
    - [ ] Notificar via Slack quando os tokens consumidos pela plataforma alcançarem cotas financeiras de orçamento definidas.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Políticas de Retenção e Expiração Inteligente de Embeddings no Cache Vetorial".

- [ ] **Feature: Políticas de Retenção e Expiração Inteligente de Embeddings no Cache Vetorial**
  - **Descrição:** Para manter o cache vetorial limpo e relevante ao longo do tempo sem custos de armazenamento excessivos, implementar um sistema de "Time-To-Live" (TTL) baseado na frequência de acesso e relevância de cada entrada.
  - **Critérios de Aceite:**
    - [ ] Adicionar um timestamp de "último acesso" em cada embedding armazenado.
    - [ ] Criar um cron job que identifique e purgue embeddings não acessados há mais de 30 dias (configurável).
    - [ ] Garantir que embeddings associados a resoluções de Self-Healing marcadas como críticas nunca sejam expirados.
    - [ ] Registrar métricas de espaço liberado e economia de armazenamento gerada pela purga.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Auditoria Constante e Limpeza de Contexto de IA".

### ÉPICO 6: Conhecimento Institucional e Documentação Autônoma
*Focado em garantir que o conhecimento técnico sobre a aplicação seja perene, acessível e sempre atualizado pelo próprio orquestrador de forma autônoma, dispensando a documentação manual massiva.*

- [ ] **Feature: Geração Autônoma de Arquitetura Viva (C4 Model)**
  - **Descrição:** O ecossistema está crescendo rapidamente e mapas mentais estáticos ficam obsoletos. Esta feature introduz um gerador dinâmico de documentação arquitetural. O orquestrador irá varrer os repositórios alvos para mapear os serviços, bancos de dados, conexões e fluxos, gerando diagramas usando a notação do C4 Model, sendo versionados em formato "como código" (e.g. PlantUML ou Mermaid). Essa iniciativa tornará a base de conhecimento institucional mais rica e acessível para novos desenvolvedores, garantindo a governança técnica.
  - **Critérios de Aceite:**
    - [ ] Criar um scanner que percorre dependências de `package.json`, `docker-compose.yaml` e arquivos de infraestrutura (Terraform/Kubernetes).
    - [ ] Traduzir essas dependências e conexões em diagramas de Contexto e Containers (C4 Model) utilizando a linguagem PlantUML ou Mermaid, de forma programática.
    - [ ] O diagrama deve ser atualizado automaticamente em um arquivo `ARCHITECTURE.md` via Pull Request sempre que ocorrerem mudanças estruturais no projeto principal ou no seu próprio orquestrador.
    - [ ] O processo de atualização não deve sobrescrever anotações manuais dos engenheiros na documentação, garantindo coexistência pacífica e merge inteligente de seções.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Documentação de API Autônoma e Testável".

- [ ] **Feature: Documentação de API Autônoma e Testável**
  - **Descrição:** Dando continuidade à Arquitetura Viva, as APIs expostas pelos microsserviços devem ter seus contratos mantidos estritamente sob supervisão da IA. O orquestrador vasculhará arquivos de roteamento e controladores, deduzirá as interfaces de entrada e saída (DTOs) com base no AST ou tipagens TypeScript/Pydantic, e gerará ou atualizará especificações OpenAPI (Swagger) automaticamente.
  - **Critérios de Aceite:**
    - [ ] Implementar a leitura dos *controllers/routers* das aplicações, suportando inicialmente Express e FastAPI, para extração de rotas, métodos (GET/POST) e *payloads*.
    - [ ] Gerar ou atualizar arquivos `openapi.yaml` garantindo conformidade com a especificação OpenAPI 3.0.
    - [ ] Adicionar um estágio no CI/CD gerado pelo orquestrador que testa automaticamente as respostas da API contra o contrato gerado usando ferramentas como Dredd ou Postman Newman, bloqueando merges de PRs que quebrem os contratos.
    - [ ] Se o PR quebrar o contrato sem intenção declarada, o agente autônomo P.O. ou de Self-Healing deverá deixar um comentário ou sugerir uma correção autônoma revertendo ou ajustando os DTOs.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Chatbot Institucional para Onboarding e Consultas de Arquitetura".

- [ ] **Feature: Chatbot Institucional para Onboarding e Consultas de Arquitetura**
  - **Descrição:** Aproveitando os dados da base vetorial do ÉPICO 3, os diagramas de Arquitetura Viva e a especificação OpenAPI, será criado um agente de conhecimento focado nos desenvolvedores. Este Chatbot (via Slack ou Web) permitirá que membros da equipe, principalmente em *onboarding*, façam perguntas sobre o ecossistema, regras de negócios documentadas no ROADMAP ou arquitetura, respondendo baseando-se única e exclusivamente nos repositórios internos e documentações geradas ativamente.
  - **Critérios de Aceite:**
    - [ ] Indexar a documentação de arquitetura, `ROADMAP.md` e o código dos microsserviços em uma base vetorial leve atualizada de forma periódica.
    - [ ] Criar uma interface conversacional (integração direta no Slack/Teams ou CLI própria).
    - [ ] As respostas fornecidas pelo Chatbot devem ser sempre concisas e conter links para a documentação ou linhas de código (referências da fonte) de onde a informação foi extraída, aumentando a confiabilidade (RAG com citações).
    - [ ] Monitorar perguntas não respondidas ou onde o Chatbot demonstrou incerteza. Isso deve gerar alertas para o P.O. ou desenvolvedores mais experientes enriquecerem a documentação.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Geração de Vídeos Explicativos (Screen-cast) via IA para Novas Features Documentadas".

- [ ] **Feature: Geração de Vídeos Explicativos (Screen-cast) via IA para Novas Features Documentadas**
  - **Descrição:** Elevar a documentação institucional para além do texto. Utilizando provedores de síntese de voz (TTS) e geração de vídeo/slides por IA, o orquestrador criará pequenos vídeos explicativos sempre que uma nova feature complexa for marcada como "concluída".
  - **Critérios de Aceite:**
    - [ ] Integrar com APIs de TTS (Text-to-Speech) para narração da descrição técnica.
    - [ ] Automatizar a captura de telas (screenshots) dos diagramas de arquitetura (PlantUML/Mermaid) via Playwright.
    - [ ] Usar uma biblioteca de renderização (ex: FFmpeg via node) para juntar o áudio com as imagens.
    - [ ] Publicar automaticamente o vídeo gerado como anexo em uma Wiki interna ou repositório de documentos do GitHub.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Tradução Automática Dinâmica de Documentação e Vídeos (I18N Autônomo)".

---


### ÉPICO 7: Expansão do Ecossistema de Testes (QA Autônomo)
*Foco na automação avançada de testes, garantindo qualidade extrema e ausência de regressões em fluxos complexos.*

- [ ] **Feature: Execução Autônoma de Testes E2E com Playwright**
  - **Descrição:** Para garantir que as integrações visuais e fluxos complexos de interface (quando aplicáveis) não sofram regressão, o orquestrador deve gerar e executar testes End-to-End (E2E) dinamicamente utilizando Playwright, validando o impacto de mudanças de PRs diretamente em ambientes efêmeros.
  - **Critérios de Aceite:**
    - [ ] Integrar a biblioteca Playwright para instanciar navegadores em modo headless no ambiente temporário.
    - [ ] Criar um motor que leia os casos de uso ou especificações e gere scripts de teste no padrão Playwright.
    - [ ] Executar a suíte gerada contra a branch em revisão, capturando artefatos como screenshots ou vídeos das falhas.
    - [ ] Postar comentários ricos no PR em caso de quebra de fluxo E2E, contendo o log e anexando a mídia gerada.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração de Testes de Regressão Visual no Pipeline de E2E".

- [ ] **Feature: Integração de Testes de Regressão Visual no Pipeline de E2E**
  - **Descrição:** Após a estabilização do Playwright, o orquestrador deve identificar mudanças visuais não-intencionais. Esta feature estende os testes E2E adicionando comparações pixel-a-pixel entre o branch atual e o main, atuando como um QA visual automatizado.
  - **Critérios de Aceite:**
    - [ ] Adicionar engine de comparação de imagens (ex: pixelmatch) acoplada aos testes E2E do Playwright.
    - [ ] Definir baselines para telas/componentes críticos e salvá-los no artefato do repositório alvo.
    - [ ] Se um PR alterar o visual de forma maior que o *threshold* permitido, a IA deve analisar se a mudança foi intencional (baseada no diff do CSS/HTML).
    - [ ] Criar relatório visual no GitHub informando "Mudança Visual Detectada" com o overlay de diferença entre a baseline e a nova versão.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Implementação de Testes de Mutação Autônomos (Mutation Testing)".

- [ ] **Feature: Implementação de Testes de Mutação Autônomos (Mutation Testing)**
  - **Descrição:** Testes unitários com 100% de cobertura podem esconder falsos positivos. Para validar a qualidade dos testes unitários e de integração, o orquestrador introduzirá ferramentas de testes de mutação (ex: Stryker Mutator) de forma autônoma para garantir que a suíte de testes realmente falhe quando o código de negócios for sabotado.
  - **Critérios de Aceite:**
    - [ ] Integrar e configurar dinamicamente o Stryker Mutator (ou equivalente para Python/TS) nos repositórios alvo.
    - [ ] Executar a suíte de mutação de forma assíncrona devido ao alto custo computacional.
    - [ ] Utilizar a IA para ler o relatório de mutação e apontar quais testes são fracos (sobrevivem à mutação) nos PRs ou Issues criadas.
    - [ ] Opcionalmente, o agente de IA P.O. pode sugerir PRs com novos testes reforçados para cobrir mutantes sobreviventes.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard Consolidado de Saúde do QA Autônomo e Confiabilidade de Testes".

- [ ] **Feature: Dashboard Consolidado de Saúde do QA Autônomo e Confiabilidade de Testes**
  - **Descrição:** Oferecer uma visão agregada da qualidade e confiança das suítes de teste, centralizando métricas de E2E, Regressão Visual e Testes de Mutação.
  - **Critérios de Aceite:**
    - [ ] Integrar os relatórios de todas as execuções de testes do Playwright e do Stryker em um dashboard comum.
    - [ ] Criar gráficos exibindo a evolução da cobertura de código e a taxa de falha dos testes ao longo do tempo.
    - [ ] Identificar testes "flaky" (que falham de forma intermitente) utilizando heurística de histórico de execuções.
    - [ ] Implementar mecanismo de alerta (Slack/Email) quando o "Mutation Score" cair abaixo de um limiar crítico.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Correção Autônoma de Testes Flaky via IA".

### ÉPICO 8: Observabilidade e FinOps Autônomo
*Foco no gerenciamento inteligente da infraestrutura e otimização de custos e recursos.*

- [ ] **Feature: Scale-to-Zero Inteligente de Workspaces Efêmeros**
  - **Descrição:** Manter workspaces provisionados quando não há PRs ou jobs ativos desperdiça recursos no cluster. O orquestrador implementará políticas agressivas de scale-to-zero, suspendendo pods e liberando volumes imediatamente após o processamento, escalando de volta apenas via Webhook sob demanda.
  - **Critérios de Aceite:**
    - [ ] Configurar os manifestos do ArgoCD/Kustomize e do job runner para operar em modo de escala reativa.
    - [ ] Criar um "Scale Manager" que monitore a fila de PRs/Issues pendentes.
    - [ ] Desalocar volumes persistentes não utilizados após um período de TTL (Time to Live) configurável (ex: 30 minutos).
    - [ ] Medir a redução no consumo de memória e CPU e gerar log estruturado indicando a economia obtida.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Monitoramento Preditivo de Anomalias no Consumo de Recursos".

- [ ] **Feature: Monitoramento Preditivo de Anomalias no Consumo de Recursos**
  - **Descrição:** Usando os dados coletados de observabilidade, o orquestrador identificará padrões anormais de uso da infraestrutura ou explosão no custo de APIs de IA antes que afetem financeiramente o projeto. Modelos preditivos simples serão usados para antecipar esgotamento de *budgets* ou falhas de disco.
  - **Critérios de Aceite:**
    - [ ] Coletar métricas agregadas de Prometheus ou Datadog referentes a CPU, Memória e custo por token de IA.
    - [ ] Estabelecer baselines de consumo normal baseados em dados de 7/14 dias (Análise de Séries Temporais básica).
    - [ ] Disparar alertas (Telegram/Slack) quando a previsão matemática indicar estouro de cota financeira em menos de 48 horas.
    - [ ] Adicionar um mecanismo de *Circuit Breaker* que pause os cronjobs pesados caso uma anomalia severa seja confirmada.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Geração Autônoma de Relatórios de FinOps e Budget Mensal".

- [ ] **Feature: Geração Autônoma de Relatórios de FinOps e Budget Mensal**
  - **Descrição:** A responsabilidade financeira do projeto precisa ser transparente. O P.O. autônomo irá atuar como gestor financeiro, gerando relatórios de fechamento mensal que discriminam os custos dos recursos provisionados e as economias geradas (por cache, scale-to-zero, etc) em formato acessível aos stakeholders.
  - **Critérios de Aceite:**
    - [ ] Criar uma rotina agendada (Cron) rodando no primeiro dia útil de cada mês.
    - [ ] Consolidar os dados do Painel de Métricas de Economia de Tokens e as estatísticas do Scale-to-Zero.
    - [ ] Compilar um relatório em PDF ou mensagem longa e rica informando: Custo total estimado, Economia Gerada e RoI de eficiência do Orquestrador.
    - [ ] Notificar de forma sumária o canal gerencial via webhook.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração de APIs de Provedores de Cloud para Faturamento Dinâmico no Relatório".

- [ ] **Feature: Integração de APIs de Provedores de Cloud para Faturamento Dinâmico no Relatório**
  - **Descrição:** Expandir os relatórios mensais de FinOps para integrar diretamente com as APIs de billing da AWS, GCP ou Azure. Isso permitirá relatórios que combinam custos da camada de IA com a fatura real dos clusters Kubernetes.
  - **Critérios de Aceite:**
    - [ ] Criar módulos conectores de billing para os principais Cloud Providers utilizando os SDKs oficiais.
    - [ ] Agregar os dados dos pods e volumes do orquestrador via tags ou labels do Kubernetes na nuvem.
    - [ ] Refatorar a geração do PDF mensal para incluir os custos reais da fatura da nuvem de forma consolidada com os custos da IA.
    - [ ] Estabelecer limite de budget unificado (Cloud + IA) que bloqueia ações pesadas caso o limite seja atingido.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Modelo Preditivo Avançado de Despesas e Planejamento Anual de Capacidade".

### ÉPICO 9: Integração de LLMs Open-Source e Edge Computing
*Focado em reduzir dependência de APIs proprietárias (como OpenAI/Anthropic) e permitir a execução do orquestrador em ambientes isolados.*

- [ ] **Feature: Suporte Nativo a Modelos Locais via Ollama/vLLM**
  - **Descrição:** Integrar de forma profunda e resiliente a capacidade de inferir usando modelos locais hospedados no próprio cluster, garantindo que repositórios com dados sensíveis possam ser analisados sem que o código saia da rede corporativa.
  - **Critérios de Aceite:**
    - [ ] Desenvolver a interface de provedor `LocalAIProvider` estendendo a infraestrutura atual para conectar com a API do Ollama e vLLM.
    - [ ] Implementar verificação de *health check* do modelo local antes de despachar jobs pesados, com fallback configurável.
    - [ ] Atualizar o `AIRouterService` para priorizar o modelo local caso o nível de confidencialidade do repositório seja marcado como alto.
    - [ ] Escrever testes unitários para a classe `LocalAIProvider` cobrindo cenários de timeout e resposta incompleta.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Monitoramento de Performance de Inferência Local".

- [ ] **Feature: Cache Híbrido de Embeddings na Edge**
  - **Descrição:** Para acelerar ainda mais o fluxo de P.O. e Self-Healing, implementar um mecanismo de cache na *edge* (como no Cloudflare Workers ou Redis no cluster local) que faça a correspondência de similaridade semântica antes de acionar modelos maiores, otimizando o tempo de resposta drasticamente.
  - **Critérios de Aceite:**
    - [ ] Configurar conexão com um banco Redis com módulo Redisearch habilitado no manifesto do k3s.
    - [ ] Implementar o serviço de cache que gera e armazena embeddings de prompts comuns e resultados de heurística.
    - [ ] Garantir que chamadas ao modelo sejam interceptadas e respondidas via cache se a similaridade for superior a 95%.
    - [ ] Criar log de auditoria explícito informando quando uma resposta foi originada do cache na Edge.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Mecanismo de Invalidação Autônoma de Cache Semântico por Contexto".

- [ ] **Feature: Mecanismo de Invalidação Autônoma de Cache Semântico por Contexto**
  - **Descrição:** Resolver problemas de dados obsoletos no cache da Edge. O orquestrador detectará automaticamente grandes refatorações no repositório (baseando-se no diff do Git) e invalidará de forma cirúrgica as chaves de cache que perderam o contexto.
  - **Critérios de Aceite:**
    - [ ] Escutar eventos de push na branch `main`.
    - [ ] Mapear arquivos modificados nos commits em relação aos metadados dos embeddings no cache.
    - [ ] Realizar invalidação seletiva via Redis/Workers apenas nas respostas impactadas pelas mudanças.
    - [ ] Escrever suíte de testes de regressão que simule o ciclo completo de hit-cache, alteração de código, miss-cache e renovação.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Descoberta Dinâmica de Nós Locais de Edge para Escalonamento de Cache".

### ÉPICO 10: Governança, Compliance e Auditoria de Ações de IA
*Focado em garantir rastreabilidade irrefutável, responsabilidade e conformidade legal sobre todas as decisões autônomas tomadas pelo orquestrador no código e infraestrutura.*

- [ ] **Feature: Trilha de Auditoria Imutável de Decisões de IA (AI Audit Trail)**
  - **Descrição:** À medida que o orquestrador toma decisões autônomas críticas (como aplicar self-healing em produção, aprovar PRs ou gerar código novo), é imperativo que exista um registro imutável do raciocínio da IA (prompt, contexto, e inferência resultante) para auditorias de segurança e compliance (ex: SOC2, ISO 27001). Esta feature implementa um registro estruturado, assinado e persistente que pode atestar "o porquê" de cada ação.
  - **Critérios de Aceite:**
    - [ ] Criar o `AIAuditLogService` para registrar sistematicamente o timestamp, ID da sessão, prompt original, modelo utilizado e resposta gerada.
    - [ ] Armazenar os logs em um datastore *append-only* ou banco de dados com versionamento estrito.
    - [ ] Assinar criptograficamente cada entrada de log para garantir que o histórico de decisões não foi adulterado pós-incidente.
    - [ ] Fornecer um endpoint `/api/audit` que permita exportar logs de decisões por repositório ou por job, filtrando por nível de criticidade de ação (ex: "Critical: Self-Healing", "Low: Code Review").
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Compliance e Revisão Humana de Auditoria".

- [ ] **Feature: Dashboard de Compliance e Revisão Humana de Auditoria**
  - **Descrição:** Uma interface Web dedicada a auditores e security officers. Ela servirá como um portal de governança onde cada decisão do modelo de IA (auditada anteriormente) pode ser revisada manualmente, endossada ou marcada para investigação de viés algorítmico.
  - **Critérios de Aceite:**
    - [ ] Criar a página do Dashboard conectada à API `/api/audit`.
    - [ ] Implementar ferramentas de busca avançada no registro de eventos de IA por data, severidade, ou palavras-chave de vulnerabilidade.
    - [ ] Adicionar botão de "Certificar Conformidade", gerando um selo no registro.
    - [ ] Fornecer exportação de "Dossiê de Conformidade" nos padrões de relatórios ISO.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Análise Autônoma de Viés (Bias) nos Logs de Revisão de PRs".

### ÉPICO 11: Integração de Pipelines de CD Avançados e Deploy Autônomo
*Focado em conectar o orquestrador ao ciclo de Continuous Deployment, permitindo aprovações de deploy autônomas e rollbacks preditivos baseados em heurísticas e testes.*

- [ ] **Feature: Análise Autônoma de Risco de Deploy (Deploy Risk Assessment)**
  - **Descrição:** Antes de um deploy ser promovido para produção, o orquestrador deve analisar as métricas do PR, o histórico de falhas dos arquivos modificados e a cobertura de testes para calcular um "Score de Risco". Se o risco for baixo, o orquestrador pode aprovar automaticamente o deploy no ArgoCD/Flux.
  - **Critérios de Aceite:**
    - [ ] Criar o `DeployRiskService` para agregar dados do SonarQube, histórico do Git e resultados de testes E2E.
    - [ ] Implementar uma matriz de peso onde mudanças em configurações de infraestrutura (Terraform/Helm) aumentam o risco exponencialmente.
    - [ ] Integrar via Webhook com o CI/CD pipeline (ex: GitHub Actions) para injetar o "Score de Risco" como um status check.
    - [ ] Se o Risco for "A" (muito baixo), aprovar automaticamente a release; caso contrário, requerer aprovação humana.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração Direta com ArgoCD para Automação de Sync e Rollback".

- [ ] **Feature: Integração Direta com ArgoCD para Automação de Sync e Rollback**
  - **Descrição:** O orquestrador não deve apenas avaliar, mas também executar ações no CD. Esta feature introduz a capacidade do agente atuar como operador do ArgoCD, disparando `syncs` de aplicações e observando o status de *health* pós-deploy. Se a aplicação degradar após o sync, o agente realiza o rollback automaticamente.
  - **Critérios de Aceite:**
    - [ ] Desenvolver `ArgoCDOperatorProvider` utilizando as APIs REST do ArgoCD.
    - [ ] Escutar eventos de `ApplicationSync` e monitorar a saúde dos pods nos primeiros 10 minutos após o deploy.
    - [ ] Caso as métricas de latência ou taxa de erro subam no Prometheus/Datadog após o deploy, acionar a reversão para a revisão do Git anterior.
    - [ ] Notificar a equipe no Slack/Telegram com o detalhamento do motivo do rollback autônomo.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Dashboard de Gestão de Releases e Decisões de CD pelo P.O. Autônomo".

- [ ] **Feature: Dashboard de Gestão de Releases e Decisões de CD pelo P.O. Autônomo**
  - **Descrição:** Para dar visibilidade às ações de deploy e rollbacks autônomos, o orquestrador deve fornecer um dashboard centralizado ou comentários agregados (Release Notes gerados por IA) nas releases do GitHub.
  - **Critérios de Aceite:**
    - [ ] Automatizar a criação de "Release Notes" ricos via LLM sempre que uma nova tag semântica for gerada.
    - [ ] O Release Note deve destacar não apenas o que mudou, mas também o "Score de Risco" calculado e o tempo de deploy aprovado autônoma ou manualmente.
    - [ ] Construir endpoint `/api/releases` para consumo de uma futura UI.
    - [ ] Gerar gráficos simples via markdown das taxas de sucesso/rollback da última sprint.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Implementação de Feature Flags Dinâmicas Controladas por IA".

- [ ] **Feature: Implementação de Feature Flags Dinâmicas Controladas por IA**
  - **Descrição:** Além de aprovar deploys e fazer rollbacks, o orquestrador poderá atuar diretamente sobre *Feature Flags* em produção, desligando módulos não-críticos em momentos de alto estresse de infraestrutura e reativando-os quando o sistema se estabilizar.
  - **Critérios de Aceite:**
    - [ ] Integrar biblioteca de Feature Flags (ex: Unleash ou LaunchDarkly).
    - [ ] Criar no orquestrador regras de decisão baseadas nas métricas de performance (latência, timeout).
    - [ ] Desligar autônoma e temporariamente flags vinculadas a cargas de trabalho intensivas ("Circuit Breaker via Flag").
    - [ ] Notificar de imediato o canal de engenharia informando qual flag foi desabilitada e o motivo da degradação.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Testes de Degradação Suave (Graceful Degradation) via Injeção de Falhas".

---

- [ ] **Feature: Mapeamento Seguro de Workspaces Efêmeros em Clusters Kubernetes**
  - **Descrição:** Evoluir a abstração do File System para suportar ambientes nativos de nuvem com alta resiliência. A feature tem como objetivo gerenciar as montagens de volumes transitórios em namespaces efêmeros do Kubernetes para armazenar dados e clones do repositório em execução durante um job de IA. Essa abstração protegerá os hosts subjacentes contra vazamento de dados confidenciais e esgotamento de inodes.
  - **Critérios de Aceite:**
    - [ ] Integrar `k8s.service.ts` para criar PersistentVolumeClaims efêmeros atrelados ao clico de vida da sessão da IA.
    - [ ] Modificar a implementação `IFileSystemManager` com uma classe `K8sVolumeFileSystemManager` que trate o pathing no ambiente distribuído.
    - [ ] Prover sanitização pesada de nomes de diretórios e validação profunda de symlinks para evitar directory traversal.
    - [ ] Testar cenários de OOM (Out Of Memory) ou preempção do nó para confirmar que os PersistentVolumes são destruídos adequadamente e não deixam rastros.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Monitoramento Dinâmico de Espaço Efêmero em Workspaces da IA".

- [ ] **Feature: Interface de Administração do Conhecimento P.O.**
  - **Descrição:** Providenciar um painel de controle (Backoffice) acessível aos administradores de produto. O painel deve permitir visualizar o banco vetorial de contexto armazenado, realizar CRUD nas "lições aprendidas", treinar heurísticas manualmente e monitorar a assertividade das features geradas pelo P.O autônomo (LLM). O objetivo de negócio é garantir controle humano sobre o direcionamento de evolução autônoma do produto.
  - **Critérios de Aceite:**
    - [ ] Criar frontend usando React ou Vue.js integrado a nova API do orquestrador, renderizando tabelas ricas e componentes de busca de similaridade do banco vetorial.
    - [ ] Desenvolver endpoints para Inserção, Atualização e Deleção de entradas de conhecimento de P.O. em formato textual, convertendo-os automaticamente para embeddings no Milvus/Qdrant.
    - [ ] Possibilitar um modo de "Simulação" no painel, onde o P.O. digita o título de uma task que supostamente foi concluída, e visualiza a feature e o gatilho previstos pela IA sem realizar commits no ROADMAP.md.
    - [ ] Adicionar um log visual de auditoria atestando qual usuário humano modificou as heurísticas de treinamento da base vetorial.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Mecanismo de Aprovação Humana de Features em Massa no Backoffice".

- [ ] **Feature: Criação de Tech Talks Dinâmicos com base em Débitos Frequentes**
  - **Descrição:** Aproveitando os dados sumarizados diários dos revisores autônomos e as estatísticas de pull requests, o sistema P.O. autônomo montará escopos, apresentações (slides/markdown) e rascunhos de roteiro para "Tech Talks" da engenharia. A IA servirá como facilitadora de evolução contínua das equipes, focando nas áreas do código que demonstraram ser os maiores gargalos de entendimento.
  - **Critérios de Aceite:**
    - [ ] Construir o `TechTalkGeneratorService`, que agrega os 3 débitos técnicos mais citados no trimestre atual a partir dos logs de PRs e PR comments do banco relacional.
    - [ ] Enviar o contexto agregado para o serviço da IA (`POService`), requerendo a geração de um roteiro de apresentação didática focado em ensinar a equipe a evitar o débito técnico.
    - [ ] Publicar automaticamente os roteiros num repositório centralizado de wiki ou em threads no GitHub Discussions/Notion.
    - [ ] Gerar uma pauta automática agendando as Tech Talks (via API do Google Calendar ou equivalente) e notificando no canal de Engenharia no Telegram.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Geração Autônoma de Material Didático Interativo (Testes) para Engenheiros".

## 📝 Gestão do Documento e Próximos Passos

Como P.O., garantirei que:
- Este documento será revisado ao fim de cada ciclo (Sprint/Release).
- **A cada marcação de checklist concluída, o orquestrador ou a equipe de desenvolvimento deverá abrir uma Issue/Task correspondente à evolução natural do produto.**
- Qualquer membro da equipe pode sugerir novas Features neste Roadmap, desde que siga o formato de "Critérios de Aceite" e defina os potenciais "Gatilhos" para o ecossistema.

*Desenvolvido e orquestrado por Jules, com foco em excelência e evolução contínua.*
