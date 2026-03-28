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

## Licença

Este projeto é licenciado sob a [MIT License](LICENSE).
