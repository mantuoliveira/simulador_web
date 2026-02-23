# Simulador de Circuitos DC (Web Mobile)

Simulador para navegador móvel com foco em circuitos DC, sem necessidade de instalação por loja.

## Como executar

1. No diretório do projeto, inicie um servidor HTTP local:

```bash
python3 -m http.server 8080
```

2. Abra no celular (ou desktop):

```text
http://SEU_IP_LOCAL:8080/index.html
```

## Uso rápido

- Barra superior: toque em um componente para inseri-lo no canvas.
- Canvas:
  - toque no corpo do componente para arrastar (movimento alinhado à grade);
  - toque em um terminal livre e depois em outro terminal livre para criar fio;
  - use dois dedos para mover câmera e pinçar zoom.
- Barra inferior:
  - `Simular` inicia simulação DC;
  - `Pausar` interrompe visualização dos resultados;
  - `↻` rotaciona componente selecionado em 90°.
- Roda de valor (canto inferior direito): aparece ao selecionar componente editável.

## Recursos implementados

- Componentes: fonte de tensão, fonte de corrente, resistor e terra.
- Ícones dos componentes em SVG.
- Grade por pontos no canvas.
- Roteamento ortogonal (90°) alinhado à grade para fios.
- Tentativa de evitar travessia de fios por dentro de componentes.
- Solver DC por Análise Nodal Modificada (MNA).
- Exibição de tensão de nó e corrente nos componentes durante simulação.
- PWA básico com `manifest` + `service worker` para suporte offline após primeiro carregamento.

## Arquivos principais

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
