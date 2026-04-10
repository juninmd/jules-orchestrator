import { RepoAnalyzerService } from '../services/repo-analyzer.service.js';
import { AIRouterService } from '../services/ai-router.service.js';
import { GithubService } from '../services/github.service.js';
import { TelegramService } from '../services/telegram.service.js';
import { env } from '../config/env.config.js';

export async function runCreateSessionsJob() {
  console.log('🤖 Iniciando rotina: CREATE_SESSIONS');
  
  const analyzer = new RepoAnalyzerService();
  const router = new AIRouterService();
  const githubService = new GithubService();
  const telegramService = new TelegramService();
  
  const repos = await githubService.getActiveRepositories(20);

  if (!repos.length) {
    console.log('Zero repositórios ativos encontrados.');
    return;
  }

  for (const repo of repos) {
    if (!repo) continue;
    
    console.log(`\n========================================`);
    console.log(`🔄 Avaliando repositório: ${repo}`);
    
    try {
      const insight = await analyzer.analyzeRepoAndGeneratePrompt(repo);
      
      if (insight) {
        // Encontramos uma melhoria válida, aciona a orquestração do Jules!
        await telegramService.sendMessage(`🤖 Jules Agent foi acionado!\n\n<b>Repositório:</b> ${repo}\n<b>Ação Necessária:</b> Foi detectado um débito técnico focado em SOLID/KISS/DRY. Jules tentará consertá-lo agorinha!`);
        await router.routeImprovement(repo, insight);
      }
    } catch (error) {
      console.error(`❌ Erro processando repositório ${repo}:`, error);
    }
  }

  console.log('✅ CREATE_SESSIONS Job concluído.');
}
