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
- `app.js`: estado do editor, interação, render principal e utilitários.
- `app-routing.js`: roteamento ortogonal dos fios.
- `app-simulation.js`: solver e anotações de simulação.
- `app-export.js`: exportação e compartilhamento de PNG.
- `app-bootstrap.js`: inicialização da aplicação.
- `manifest.webmanifest` e `service-worker.js`: recursos do PWA.

## Verificações úteis

Checagem rápida dos arquivos principais:

```bash
git diff -- index.html styles.css app.js app-routing.js app-simulation.js app-export.js app-bootstrap.js service-worker.js README.md
```

Checagem de sintaxe dos scripts:

```bash
node --check app.js
node --check app-routing.js
node --check app-simulation.js
node --check app-export.js
node --check app-bootstrap.js
node --check service-worker.js
```
