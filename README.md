# Simulador de Circuitos DC

Aplicativo web estático para montar, editar e simular circuitos DC com foco em uso rápido no celular, mas funcionando também no desktop. O projeto roda direto no navegador, pode ser instalado na tela inicial como PWA e não depende de build ou backend.

## Recursos

- Componentes disponíveis: fonte de tensão, fonte de corrente, resistor, amp op, diodo, transistor NPN, transistor PNP e terra.
- Canvas com grade por pontos, pan e zoom.
- Roteamento ortogonal automático de fios.
- Junções automáticas ao conectar em um fio existente.
- Auto-conexão por arraste quando dois terminais se encontram de forma inequívoca.
- Simulação DC com solver MNA e suporte a diodo, transistor NPN, transistor PNP e amp op.
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
- `app-bootstrap.js`: entrypoint ESM da aplicação.
- `bootstrap/bootstrap.js`: orquestração de startup.
- `core/constants.js`: constantes e definições de componentes.
- `core/behaviors.js`: comportamento específico por componente, SVG e lógica de valor.
- `core/model.js`: helpers puros de geometria, layout e ids de circuito.
- `core/support.js`: utilitários matemáticos, formatação, SVG e helpers compartilhados.
- `runtime/state.js`: estado global, referências de DOM e render targets compartilhados.
- `runtime/ui.js`: tema, sprites, barra de componentes e resize do canvas.
- `runtime/viewport.js`: conversões entre coordenadas de tela e mundo.
- `render/render.js`: render do canvas, loop de renderização e service worker.
- `editor/ui.js`: helpers de UI e feedback visual.
- `editor/selectors.js`: seletores somente-leitura sobre o estado.
- `editor/circuit.js`: edição do circuito, seleção, utilitários do editor e integrações centrais.
- `editor/controls.js`: ações da barra, atalhos e controles de edição.
- `editor/interactions.js`: gestos, mouse, touch, zoom e wheel.
- `editor/routing.js`: roteamento ortogonal dos fios.
- `simulation/solver.js`: solver e anotações de simulação.
- `export/png.js`: exportação e compartilhamento de PNG.
- `manifest.webmanifest` e `service-worker.js`: recursos do PWA.

## Mapa rápido para manutenção

- Mudanças visuais e de desenho do canvas: `styles.css` e `render/render.js`.
- Estado global e render targets: `runtime/state.js`.
- Tema, sprites e bootstrap visual: `runtime/ui.js`.
- Conversões entre tela e mundo: `runtime/viewport.js`.
- Botões, atalhos e ações da UI: `editor/controls.js`.
- Estado visual de botões e status: `editor/ui.js`.
- Gestos, mouse, touch e zoom: `editor/interactions.js`.
- Seletores somente-leitura: `editor/selectors.js`.
- Seleção, edição de circuito e limpeza de topologia: `editor/circuit.js`.
- Roteamento de fios: `editor/routing.js`.
- Solver DC e anotações de simulação: `simulation/solver.js`.
- Exportação de imagem: `export/png.js`.
- Ordem de carregamento do entrypoint e bootstrap: `index.html`, `app-bootstrap.js` e `bootstrap/bootstrap.js`.
- Cache offline de assets: `service-worker.js`.
- Notas de invariantes e refatoração segura: `docs/refactor-notes.md`.

## Verificações úteis

Checagem rápida dos arquivos principais:

```bash
git diff -- index.html styles.css app-bootstrap.js bootstrap/bootstrap.js core/constants.js core/support.js runtime/state.js render/render.js editor/circuit.js editor/controls.js editor/interactions.js editor/routing.js simulation/solver.js export/png.js service-worker.js README.md
```

Checagem rápida no navegador após mudanças em módulos:

```bash
python3 -m http.server 8080
# depois abra http://localhost:8080/index.html
```
