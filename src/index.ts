import { validateEnv, env } from './config/env.config.js';
import { OllamaService } from './services/ollama.service.js';
import { GithubService } from './services/github.service.js';
import { JulesService } from './services/jules.service.js';

async function bootstrap() {
  console.log('🚀 Iniciando o Orquestrador Jules!');
  
  // 1. Validação do ambiente
  validateEnv();

  const ollama = new OllamaService();
  const github = new GithubService();
  const jules = new JulesService();

  const mockContext = `
    O repositório atual possui vários controllers gordinhos (fat controllers) 
    que centralizam regras de negócios e chamadas ao banco de dados diretamente,
    desrespeitando o princípio da Responsabilidade Única (SOLID).
  `;

  try {
    // 2. Gerar Prompt de Melhoria via IA
    console.log('\n🧠 Calculando melhorias...');
    const improvement = await ollama.generateImprovementPrompt(mockContext);
    
    // Simples parsing do retorno (KISS)
    // Assumimos que a IA retornou a primeira linha como título e o resto como body.
    const [titleLine, ...bodyLines] = improvement.split('\n');
    const cleanTitle = titleLine.replace(/^#+ /, '').trim();
    const cleanBody = bodyLines.join('\n').trim();

    // 3. Documentar no Github (Issue)
    console.log('\n📝 Abrindo Issue no GitHub...');
    const issueUrl = await github.createImprovementIssue(cleanTitle, cleanBody);

    // 4. Invocar API do Jules para inciar sessão de trabalho automatizada
    console.log('\n🤖 Acordando o Jules nas trincheiras...');
    await jules.invokeSession({
      issueUrl,
      prompt: improvement, // Enviamos o raw gerado
      repository: env.TARGET_REPO
    });

    console.log('\n✅ Orquestração concluída com sucesso. Dominando o mundo em 3, 2, 1...');
  } catch (err) {
    console.error('\n❌ Erro durante a orquestração:', err);
    process.exit(1);
  }
}

// Inicializa a aplicação
bootstrap();
