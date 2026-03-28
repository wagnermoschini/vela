# Vela Desktop App

Vela é um aplicativo desktop moderno no estilo "Claude/Cowork", focado em rodar Modelos de Linguagem (LLMs) self-hosted localmente via Ollama, garantindo alta performance, baixo uso de RAM e privacidade máxima.

## Stack Tecnológico

- **Desktop Wrapper:** Tauri (Rust backend)
- **Frontend:** React + Vite + TypeScript
- **UI & Componentes:** Ant Design (AntD) + Ant Design X (AntX)
- **Local LLM Engine:** Ollama (`localhost:11434`)
- **Integração de Skills (MCP):** Python Sidecar via protocolo MCP
- **Artefatos e Renderização:** Sandpack 

## Setup Local (Desenvolvimento)

Siga os passos abaixo para configurar o Vela no seu ambiente local (Mac M4 Max/Apple Silicon recomendado).

### Pré-requisitos

1. **Rust & Cargo**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. **Node.js & npm/pnpm/yarn**: Recomenda-se Node.js v18 ou superior.
3. **Python 3.10+**: Necessário para rodar o sidecar MCP.
4. **Ollama**: Instale a versão desktop [aqui](https://ollama.com/) e baixe o modelo desejado (ex: `ollama run llama3`).

### Instalação

1. Clone o repositório:
   ```bash
   git clone git@github.com:wagnermoschini/vela.git
   cd vela
   ```
2. Instale as dependências do Frontend:
   ```bash
   npm install
   ```
3. Inicie o lado Rust (Tauri) aliado ao Frontend (Vite) em modo de desenvolvimento:
   ```bash
   npm run tauri dev
   ```

O aplicativo abrirá nativamente com carregamento via modo debug, permitindo Hot Module Replacement (HMR). O backend em Rust será recompilado à medida que o projeto sofrer alterações sensíveis da casca desktop.

### Arquitetura de Pastas

- `/src` - Componentes React, regras de UI AntX e layout minimalista (3 painéis).
- `/src-tauri` - Rust backend e o manifesto (`tauri.conf.json`).
- `/src-tauri/python` - Pipeline de MCP usando scripts python nativos via stdio stdin/stdout.

## 🚀 Guia de Execução: Suas Primeiras Fases no Vela

Siga este passo a passo para validar todas as funcionalidades desenvolvidas.

### 📝 Passo 0: Preparação do Ambiente Python
O Vela utiliza um sidecar Python para RAG e Ferramentas (MCP). Instale as dependências necessárias:
```bash
pip install lancedb tavily-python python-dotenv
```

### 🔑 Passo 1: Configuração de Chaves (.env)
1. Na raiz do projeto, você encontrará um arquivo `.env`.
2. Insira sua `TAVILY_API_KEY` (obtenha em [tavily.com](https://tavily.com)).
3. (Opcional) Insira seu `ATLASSIAN_API_TOKEN` se desejar testar o conector Rovo.

### 🏁 Passo 2: A Primeira Execução
Rode o comando:
```bash
npm run tauri dev
```
- **O que observar**: O Vela detectará se você já tem os modelos (`llama3.1:8b` e `qwen2.5-coder:7b`) instalados. Caso não tenha, ele oferecerá a instalação em um clique com barra de progresso.

### 🧠 Passo 3: Testando a Memória Global (RAG)
O Vela nunca esquece. Faça o seguinte teste:
1. No chat, diga: *"O código secreto do projeto é VELA-2026"*.
2. Clique no botão **"New Project"** na barra lateral para limpar a sessão.
3. Pergunte: *"Qual é o código do projeto?"*.
- **Resultado**: O Vela fará uma busca no **LanceDB** local e recuperará a informação correta.

### 🔍 Passo 4: Busca em Tempo Real (Tavily)
Teste o acesso à internet:
1. Pergunte: *"Quais as notícias mais recentes sobre IA hoje?"*.
- **Resultado**: O Vela invocará a tool `web_search`, acessará o Tavily e trará resultados reais com links.

### 🛠️ Passo 5: Gerenciando o Backlog
O Vela gerencia o próprio futuro. Tente:
1. Diga: *"Adicione 'Criar tema Dark Mode' ao meu backlog"*.
2. Verifique o arquivo `backlog.md` na raiz do seu computador.
- **Resultado**: O item será adicionado com data e prioridade automaticamente.

### 🏥 Passo 6: Centro de Diagnóstico
Se algo não estiver funcionando, vá na aba **"Diagnostics"** na barra lateral.
- Verifique se os indicadores de **Ollama**, **MCP Sidecar** e **LanceDB** estão verdes.

---

## Licença

Este projeto é licenciado sob a [MIT License](LICENSE).
