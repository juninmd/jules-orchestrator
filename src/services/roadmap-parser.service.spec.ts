import { describe, it, expect } from 'vitest';
import { RoadmapParserService } from './roadmap-parser.service.js';

describe('RoadmapParserService', () => {
  const parser = new RoadmapParserService();

  it('deve extrair tarefas incompletas e completas corretamente com seus gatilhos', () => {
    const mockRoadmap = `
# Roadmap

- [ ] **Feature: Otimização no Roteamento**
  - **Descrição:** Melhorar o roteador para selecionar modelo.
  - **Critérios de Aceite:**
    - [ ] Criar tabela.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Melhorar Fallback de IA".

- [x] **Feature: Parser Dinâmico de Checklists**
  - **Descrição:** O orquestrador deve ler o ROADMAP.
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração com Github Issues".
`;

    const tasks = parser.extractTasks(mockRoadmap);

    expect(tasks).toHaveLength(2);

    expect(tasks[0].title).toBe('Otimização no Roteamento');
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].trigger).toBe('Melhorar Fallback de IA');

    expect(tasks[1].title).toBe('Parser Dinâmico de Checklists');
    expect(tasks[1].completed).toBe(true);
    expect(tasks[1].trigger).toBe('Integração com Github Issues');
  });

  it('deve ignorar tarefas sem gatilho ou com formato inválido graciosamente', () => {
    const mockRoadmap = `
- [x] **Feature: Teste Sem Gatilho**
  - **Descrição:** Esta task não tem gatilho.
`;

    const tasks = parser.extractTasks(mockRoadmap);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Teste Sem Gatilho');
    expect(tasks[0].completed).toBe(true);
    expect(tasks[0].trigger).toBeUndefined();
  });
});
