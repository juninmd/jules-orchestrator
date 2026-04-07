import { env } from '../config/env.config.js';

export interface OllamaResponse {
  response: string;
}

export class OllamaService {
  public async generateImprovementPrompt(context: string): Promise<string> {
    const prompt = `Atue como um Engenheiro de Software Sênior extremamente focado na entrega de valor e simplicidade (KISS e DRY).
Gere uma sugestão de melhoria técnica bem específica e acionável com base neste contexto:
CONTEXTO: ${context}

A sugestão deve conter:
1. Um Título descritivo em uma única linha, sem prefixos, apenas o título.
2. A Descrição do problema atual ou oportunidade.
3. Critérios de aceitação para o Jules resolver.
Não inclua introduções como "Aqui está a sugestão:". Somente o conteúdo que deverá ser enviado direto para a task.`;

    try {
      console.log(`[OllamaService] Solicitando nova melhoria via ${env.OLLAMA_MODEL}...`);
      
      const res = await fetch(`${env.OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.statusText}`);
      }

      const data = (await res.json()) as OllamaResponse;
      return data.response.trim();
    } catch (error) {
      console.error('[OllamaService] Erro crítico ao conectar com Ollama.', error);
      throw error;
    }
  }
}
