---
name: project-handover
description: Gerencia o ciclo de continuidade, briefing de abertura de sessão e checkpoint de encerramento diário (handover) do RestauraFoto mantendo o docs/PROJECT_STATUS.md sempre atualizado.
---

# 🔄 Skill: project-handover (RestauraFoto)

Esta skill operacionaliza a **Malha Fechada de Continuidade (Closed-Loop Handover)** do projeto RestauraFoto, permitindo que diferentes instâncias do agente (ou a mesma em dias consecutivos) mantenham a memória viva do projeto acadêmico sem sofrer de *Cold Start* ou *Amnésia de Sessão*.

---

## 🌅 Modo 1: Briefing de Abertura (Início da Sessão / Retomada do Dia)

Quando uma nova conversa é iniciada ou quando o usuário solicitar um alinhamento inicial (ex: *"onde paramos?"*, *"qual o status do projeto?"*, *"briefing do dia"*):

### Passo 1: Leitura do Tacógrafo Vivo
Inspecione imediatamente o arquivo canônico:
👉 [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md)

### Passo 2: Verificação Rápida de Saúde das Três Camadas
Execute uma checagem rápida de integridade:
```bash
bash scripts/dev/agent-diagnostics.sh
```

### Passo 3: Apresentar o Briefing Matinal ao Usuário
Envie um resumo estruturado no seguinte formato:

```text
🌅 Olá! Aqui está o briefing de continuidade do RestauraFoto:

📌 Status da Engenharia: Rust (Tauri v2 + PyO3) | Python 3.13 (OpenCV) | Frontend (TS/Vite)
🧪 Saúde dos Testes: 100% Saudável (X testes unitários CV, 0 erros Rust, 0 erros TS)
🎯 Onde paramos na última sessão: [Resumo sucinto da última entrega]
🎓 Requisitos FATEC Atendidos: [X de Y técnicas implementadas]
🚧 Próximo passo prioritário da fila: [Item 1 dos próximos passos]

Deseja continuar com esse item ou temos uma nova prioridade para hoje?
```

---

## 🌙 Modo 2: Checkpoint de Fechamento (Encerramento do Dia / Handover)

Quando o usuário indicar que deseja encerrar as atividades (ex: *"vamos parar por hoje"*, *"encerrar o dia"*, *"gerar handover"*, *"fechar sessão"*):

### Passo 1: Validação de Integridade e Testes
Execute a bateria de validação unificada:
```bash
bash scripts/dev/agent-diagnostics.sh
git status -s
```

### Passo 2: Atualização do [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md)
Edite o arquivo [`docs/PROJECT_STATUS.md`](/docs/PROJECT_STATUS.md) atualizando:
1. `Data do Último Checkpoint` e `Hora Local`.
2. `Status da Engenharia` e contagem de testes.
3. Seção `4. Conquistas e Entregas da Última Sessão`: Liste com precisão o que foi concluído na data.
4. Seção `5. Tarefas em Andamento (WIP)`: Registre pendências ou branchs ativas.
5. Seção `6. Próximos Passos Prioritários para a Próxima Sessão`: Detalhe o que deve ser feito a seguir para guiar a próxima retomada.
6. Seção `7. Base de Conhecimento e Armadilhas Técnicas Conhecidas`: Adicione qualquer novo gotcha ou lição aprendida durante o dia.
7. Seção `8. Histórico Recente`: Adicione uma nova linha de log com data e sumário da entrega.

### Passo 3: Apresentar o Cartão de Fechamento ao Desenvolvedor
Finalize o atendimento com um resumo claro e amigável:

```text
🌙 Checkpoint de encerramento registrado com sucesso!

✅ Todas as conquistas de hoje foram sincronizadas no docs/PROJECT_STATUS.md.
🧪 Estado dos testes: 100% aprovados nas 3 camadas.
📋 O próximo agente já saberá exatamente onde paramos e qual é o próximo passo prioritário.

Bom descanso e até a próxima sessão! 🚀
```
