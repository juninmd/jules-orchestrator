import { validateEnv } from './config/env.config.js';
import { AIRouterService } from './services/ai-router.service.js';

async function bootstrap() {
  console.log('🚀 Iniciando o Orquestrador Jules com Vercel AI SDK!');
  
  validateEnv();

  const router = new AIRouterService();

  const mockContext = `
    O repositório está desatualizado com bibliotecas vuneráveis e com controllers acoplados ao DB.
    Queria que você primeiro criasse uma issue reportando o débito técnico geral, 
    e depois já invocasse o agente Jules pedindo pra ele atualizar os pacotes mais críticos.
  `;

  try {
    console.log('\n🧠 Calculando e distribuindo tarefas nas ferramentas do SDK...');
    await router.routeImprovement(mockContext);

    console.log('\n✅ Orquestração em cadeia concluída com sucesso!');
  } catch (err) {
    console.error('\n❌ Erro durante a orquestração:', err);
    process.exit(1);
  }
}

bootstrap();
