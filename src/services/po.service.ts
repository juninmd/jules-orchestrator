import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import { env } from '../config/env.config.js';

export class POService {
  private ollama = createOllama({ baseURL: `${env.OLLAMA_HOST}/api` });

  /**
   * Gera uma nova feature baseada em um gatilho e no contexto de uma task recém-completada.
   */
  public async generateNewFeature(completedTaskTitle: string, completedTaskContext: string, newFeatureTitle: string): Promise<string> {
    console.log(`[POService] Gerando nova feature: "${newFeatureTitle}" baseada em "${completedTaskTitle}"`);

    const prompt = `Você atua como um Product Owner sênior e técnico.
A tarefa "${completedTaskTitle}" acaba de ser concluída.
Contexto da tarefa que foi concluída:
${completedTaskContext}

Como gatilho desta conclusão, uma nova tarefa precisa ser adicionada ao ROADMAP.md.
O título da nova tarefa será: "${newFeatureTitle}".

Gere o corpo desta nova feature em formato Markdown, seguindo a estrutura padrão:
- [ ] **Feature: ${newFeatureTitle}**
  - **Descrição:** [Uma descrição detalhada sobre a funcionalidade, o porquê de existir e seu objetivo de negócio/técnico]
  - **Critérios de Aceite:**
    - [ ] [Critério 1]
    - [ ] [Critério 2]
    - [ ] [Critério 3]
    - [ ] [Critério 4]
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "[Pense em uma próxima task que daria continuidade lógica]".

Sua resposta deve ser EXATAMENTE o markdown da feature a ser inserido, sem nenhuma saudação ou comentário inicial/final.
Apenas o bloco Markdown. Retorne APENAS conteúdo Markdown com os checkboxes exatamente como o template e com muito detalhe em português do Brasil.`;

    try {
      const result = await generateText({
        model: this.ollama(env.OLLAMA_MODEL),
        prompt: prompt,
      });

      return result.text.trim();
    } catch (error) {
      console.error('[POService] Falha ao gerar nova feature:', error);
      throw error;
    }
  }
}
