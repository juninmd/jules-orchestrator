import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoadmapParserService } from './roadmap-parser.service.js';
import fsSync from 'node:fs';

vi.mock('node:fs');

describe('RoadmapParserService', () => {
  let parser: RoadmapParserService;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = new RoadmapParserService('/mock/ROADMAP.md', '/mock/.roadmap-state.json');
  });

  it('deve retornar vazio se o arquivo roadmap não existir', () => {
    vi.mocked(fsSync.existsSync).mockReturnValue(false);

    const result = parser.parse();
    expect(result).toEqual([]);
  });

  it('deve fazer o parsing correto de tasks e extrair gatilhos', () => {
    const mockMarkdown = `
### ÉPICO 4: Automação do Papel de Product Owner (P.O. Autônomo)

- [x] **Feature: Parser Dinâmico de Checklists do ROADMAP**
  - **Descrição:** O orquestrador deve ler continuamente o estado do ROADMAP.md.
  - **Critérios de Aceite:**
    - [x] Criar um parser em Markdown
  - **Gatilho de Novas Tasks:** A conclusão desta feature gerará a task "Integração do Parser de Roadmap com o Gerenciador de Issues do GitHub".

- [ ] **Feature: Motor de Geração de Novas Features**
  - **Descrição:** Uma vez detectado...
`;

    vi.mocked(fsSync.existsSync).mockImplementation((path) => {
      if (path === '/mock/ROADMAP.md') return true;
      return false;
    });

    vi.mocked(fsSync.readFileSync).mockReturnValue(mockMarkdown);

    const tasks = parser.parse();

    expect(tasks.length).toBe(2);

    expect(tasks[0].epic).toBe('ÉPICO 4: Automação do Papel de Product Owner (P.O. Autônomo)');
    expect(tasks[0].title).toBe('Parser Dinâmico de Checklists do ROADMAP');
    expect(tasks[0].completed).toBe(true);
    expect(tasks[0].trigger).toBe('A conclusão desta feature gerará a task "Integração do Parser de Roadmap com o Gerenciador de Issues do GitHub".');
    expect(tasks[0].description).toContain('O orquestrador deve ler continuamente');

    expect(tasks[1].title).toBe('Motor de Geração de Novas Features');
    expect(tasks[1].completed).toBe(false);
    expect(tasks[1].trigger).toBeUndefined();
  });

  it('deve filtrar apenas tasks concluídas e com gatilho que ainda não foram processadas', () => {
    const mockMarkdown = `
### ÉPICO 1
- [x] **Feature: Task A**
  - **Gatilho de Novas Tasks:** Trigger A
- [x] **Feature: Task B**
  - **Gatilho de Novas Tasks:** Trigger B
- [ ] **Feature: Task C**
  - **Gatilho de Novas Tasks:** Trigger C
`;

    vi.mocked(fsSync.existsSync).mockReturnValue(true);

    vi.mocked(fsSync.readFileSync).mockImplementation((path: any) => {
      if (path === '/mock/ROADMAP.md') return mockMarkdown;
      if (path === '/mock/.roadmap-state.json') return JSON.stringify(['Task A']);
      return '';
    });

    const unprocessed = parser.getUnprocessedCompletedTriggers();

    expect(unprocessed.length).toBe(1);
    expect(unprocessed[0].title).toBe('Task B');
  });

  it('deve marcar uma task como processada adicionando-a ao estado', () => {
    vi.mocked(fsSync.existsSync).mockReturnValue(true);
    vi.mocked(fsSync.readFileSync).mockReturnValue(JSON.stringify(['Task A']));

    parser.markTaskAsProcessed('Task B');

    expect(fsSync.writeFileSync).toHaveBeenCalled();
    const writeCall = vi.mocked(fsSync.writeFileSync).mock.calls[0];
    expect(writeCall[0]).toBe('/mock/.roadmap-state.json');
    expect(writeCall[1]).toContain('Task B');
  });
});
