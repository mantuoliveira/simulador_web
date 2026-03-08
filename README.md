# Simulador de Circuitos DC

Aplicativo web estático para montar, editar e simular circuitos DC com foco em uso rápido no celular, mas funcionando também no desktop. O projeto roda direto no navegador, pode ser instalado na tela inicial como PWA e não depende de build ou backend.

## Recursos

- Componentes disponíveis: fonte de tensão, fonte de corrente, resistor, amp op, diodo, transistor NPN e terra.
- Canvas com grade por pontos, pan e zoom.
- Roteamento ortogonal automático de fios.
- Junções automáticas ao conectar em um fio existente.
- Auto-conexão por arraste quando dois terminais se encontram de forma inequívoca.
- Simulação DC com solver MNA e suporte a diodo, transistor NPN e amp op.
- Exportação de PNG sem grade, com corte automático e render em alta resolução.
- Compartilhamento nativo no mobile quando suportado.
- PWA com cache offline após o primeiro carregamento.

## Como executar

Não há etapa de build nem instalação de dependências.

Servidor local simples:

```bash
python3 -m http.server 8080
```

Para testar no celular pela rede local:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Abra:

```text
http://localhost:8080/index.html
```

Ou substitua `localhost` pelo IP da máquina na rede local.

## Como usar

### Edição

- Toque ou clique em um componente da barra superior para inseri-lo.
- Arraste um componente para mover.
- Toque em um terminal e depois em outro para criar um fio.
- Toque em um fio para selecioná-lo.
- Ao arrastar um componente até encostar um terminal em outro, a conexão pode ser criada automaticamente.

### Navegação

- Mobile: arraste o canvas para pan e use pinça para zoom.
- Desktop: arraste em área vazia para pan e use a roda do mouse para zoom.
- Duplo toque em área vazia redefine o zoom para o padrão.

### Barra inferior

- `Play/Pause`: inicia ou pausa a simulação.
- `Lixeira`: remove o componente ou fio selecionado.
- Segurar a lixeira por 2 segundos limpa todo o circuito.
- `↻`: rotaciona o componente selecionado.
- Botão de inversão: alterna a ordem de terminais dos componentes que suportam isso.
- Botão de exportação: aparece quando há circuito montado e nada selecionado.

### Valores

- Componentes editáveis exibem a roda de valor no canto inferior direito.
- O valor exibido no centro da roda acompanha o componente selecionado.

## Exportação de imagem

- Gera PNG com fundo transparente.
- Não inclui os pontos da grade.
- Remove automaticamente a área vazia ao redor do circuito.
- Exporta em escala maior para melhorar nitidez.
- No desktop faz download do arquivo.
- No mobile tenta abrir a folha nativa de compartilhamento.

## Estrutura do projeto

- `index.html`: shell da interface.
- `styles.css`: layout e estilos.
- `app-core.js`: constantes, definições de componentes e comportamento de domínio.
- `app-support.js`: utilitários matemáticos, formatação, SVG e helpers compartilhados.
- `app-runtime.js`: estado global, referências de DOM e bootstrap de canvas/tema.
- `app-controls.js`: ações da barra, atalhos e controles de edição.
- `app-render.js`: render do canvas, sprites, tema visual e loop de renderização.
- `app-interaction.js`: gestos, mouse, touch, zoom e wheel.
- `app.js`: edição do circuito, seleção, utilitários do editor e integrações centrais.
- `app-routing.js`: roteamento ortogonal dos fios.
- `app-simulation.js`: solver e anotações de simulação.
- `app-export.js`: exportação e compartilhamento de PNG.
- `app-bootstrap.js`: inicialização da aplicação.
- `manifest.webmanifest` e `service-worker.js`: recursos do PWA.

## Mapa rápido para manutenção

- Mudanças visuais e de desenho do canvas: `styles.css` e `app-render.js`.
- Estado global, DOM e resize/bootstrap: `app-runtime.js`.
- Botões, atalhos e ações da UI: `app-controls.js`.
- Gestos, mouse, touch e zoom: `app-interaction.js`.
- Seleção, edição de circuito e limpeza de topologia: `app.js`.
- Roteamento de fios: `app-routing.js`.
- Solver DC e anotações de simulação: `app-simulation.js`.
- Exportação de imagem: `app-export.js`.
- Ordem de carregamento dos scripts: `index.html`.
- Cache offline de assets: `service-worker.js`.
- Notas de invariantes e refatoração segura: `docs/refactor-notes.md`.

## Verificações úteis

Checagem rápida dos arquivos principais:

```bash
git diff -- index.html styles.css app-core.js app-support.js app-runtime.js app-controls.js app-render.js app-interaction.js app.js app-routing.js app-simulation.js app-export.js app-bootstrap.js service-worker.js README.md
```

Checagem de sintaxe dos scripts:

```bash
node --check app-core.js
node --check app-support.js
node --check app-runtime.js
node --check app-controls.js
node --check app-render.js
node --check app-interaction.js
node --check app.js
node --check app-routing.js
node --check app-simulation.js
node --check app-export.js
node --check app-bootstrap.js
node --check service-worker.js
```
