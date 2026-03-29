import sys
import json
import logging
import os
import datetime
import platform
import subprocess
import time

# Configuração de logging e ambiente (Nível ALPHA)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] ALPHA-AUDIT: %(message)s",
    filename="mcp_sidecar.log"
)

# Tentativa de importar LanceDB para RAG (Retrieval-Augmented Generation)
try:
    import lancedb
    from lancedb.embeddings import get_registry
    from lancedb.pydantic import LanceModel, Vector
    LANCEDB_AVAILABLE = True
    logging.info("LanceDB modules loaded successfully.")
except Exception as e:
    logging.error(f"LanceDB import error: {e}", exc_info=True)
    LANCEDB_AVAILABLE = False

try:
    from dotenv import load_dotenv
    from tavily import TavilyClient
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False

# Configuração de logging e ambiente (Nível ALPHA)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] ALPHA-AUDIT: %(message)s",
    filename="mcp_sidecar.log"
)

if DOTENV_AVAILABLE:
    load_dotenv()
    logging.info("Variáveis de ambiente carregadas via .env")

# Caminhos e Constantes
DB_PATH = os.path.join(os.getcwd(), "data", "vela_vectors")
TABLE_NAME = "global_memory"
BACKLOG_PATH = os.path.join(os.getcwd(), "backlog.md")

db = None
table = None

if LANCEDB_AVAILABLE:
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        db = lancedb.connect(DB_PATH)
        embedding_func = get_registry().get("ollama").create(name="nomic-embed-text")

        class MemoryRecord(LanceModel):
            text: str = embedding_func.SourceField()
            vector: Vector(embedding_func.ndims()) = embedding_func.VectorField()
            role: str
            space_id: str
            timestamp: str
            metadata: str

        if TABLE_NAME in db.table_names():
            table = db.open_table(TABLE_NAME)
        else:
            table = db.create_table(TABLE_NAME, schema=MemoryRecord)
        logging.info("LanceDB inicializado.")
    except Exception as e:
        logging.error(f"Erro ao inicializar LanceDB: {str(e)}")
        LANCEDB_AVAILABLE = False

def add_to_backlog(title, description, priority="Média"):
    """Adiciona uma ideia ao backlog.md e indexa na memória global."""
    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # 1. Escreve no Markdown
    new_entry = f"| {date_str} | {title} | {description} | {priority} |\n"
    if not os.path.exists(BACKLOG_PATH):
        with open(BACKLOG_PATH, 'w', encoding='utf-8') as f:
            f.write("# Backlog de Funcionalidades - Vela Project\n\n")
            f.write("| Data | Título | Descrição | Prioridade |\n")
            f.write("| --- | --- | --- | --- |\n")
    
    with open(BACKLOG_PATH, 'a', encoding='utf-8') as f:
        f.write(new_entry)

    # 2. Indexa na Memória Global (RAG)
    if LANCEDB_AVAILABLE:
        try:
            table.add([{
                "text": f"Backlog Item: {title} - {description} (Prioridade: {priority})",
                "role": "system_backlog",
                "timestamp": datetime.datetime.now().isoformat(),
                "metadata": json.dumps({"type": "backlog", "title": title})
            }])
        except Exception as e:
            logging.error(f"Erro ao indexar backlog: {e}")
            
    return {"status": "success", "message": f"Item '{title}' adicionado ao backlog."}

def atlassian_query(query, site_url=None, email=None, api_token=None):
    """Interface para o conector Atlassian Rovo via MCP."""
    token = api_token or os.getenv("ATLASSIAN_API_TOKEN")
    if not token:
        return {"status": "auth_required", "message": "API Token da Atlassian necessário."}
    
    return {
        "status": "success",
        "results": [
            {"type": "Jira Issue", "key": "VELA-42", "summary": f"Resultado simulado para: {query}"}
        ]
    }

def web_search(query):
    """Realiza busca na web usando Tavily."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key or "YOUR_KEY" in api_key:
        return {"error": "TAVILY_API_KEY não configurada no arquivo .env"}
    
    if not DOTENV_AVAILABLE:
        return {"error": "Biblioteca 'tavily-python' não instalada."}

    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, search_depth="advanced")
        return {
            "query": query,
            "results": [
                {"title": r.get("title"), "url": r.get("url"), "content": r.get("content")}
                for r in response.get("results", [])
            ]
        }
    except Exception as e:
        return {"error": f"Erro na busca Tavily: {str(e)}"}

def detect_hardware():
    """Detecta RAM e CPU (otimizado para Mac) e gera relatório de auditoria."""
    try:
        # RAM
        ram_bytes = subprocess.check_output(['sysctl', '-n', 'hw.memsize']).decode().strip()
        ram_gb = int(ram_bytes) / (1024**3)
        
        # CPU
        cpu_brand = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string']).decode().strip()
        
        report = {
            "ram_gb": round(ram_gb, 2),
            "cpu": cpu_brand,
            "os": f"{platform.system()} {platform.machine()}",
            "is_apple_silicon": "Apple" in cpu_brand,
            "at": datetime.datetime.now().isoformat()
        }
        
        # Salva auditoria manual em JSON
        with open("hardware_audit.json", "w") as f:
            json.dump(report, f, indent=4)
        logging.info(f"Diagnóstico de hardware concluído e auditado: {report['ram_gb']}GB RAM.")
        
        return report
    except Exception as e:
        logging.error(f"Erro no diagnóstico de hardware: {e}")
        return {"error": f"Erro ao detectar hardware: {str(e)}"}

def list_tools():
    tools = [
        {"name": "read_file", "description": "Lê conteúdo de arquivo local."},
        {
            "name": "web_search",
            "description": "Pesquisa informações em tempo real na internet via Tavily AI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "O que você deseja pesquisar?"}
                },
                "required": ["query"]
            }
        },
        {
            "name": "add_to_backlog",
            "description": "Adiciona sugestões de funcionalidades ao backlog.md e à memória global.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Título da ideia"},
                    "description": {"type": "string", "description": "Descrição detalhada"},
                    "priority": {"type": "string", "enum": ["Alta", "Média", "Baixa"], "default": "Média"}
                },
                "required": ["title", "description"]
            }
        },
        {
            "name": "atlassian_rovo",
            "description": "Consulta dados no Jira ou Confluence via Atlassian Remote MCP.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Termo de busca"},
                    "site_url": {"type": "string", "description": "URL do site Atlassian (ex: meuprojeto.atlassian.net)"},
                    "api_token": {"type": "string", "description": "API Token gerado na Atlassian"}
                },
                "required": ["query"]
            }
        }
    ]
    
    if LANCEDB_AVAILABLE:
        tools.extend([
            {
                "name": "memory_store",
                "description": "Salva informação na memória global.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string"},
                        "role": {"type": "string"},
                        "metadata": {"type": "object"}
                    },
                    "required": ["content", "role"]
                }
            },
            {
                "name": "memory_retrieve",
                "description": "Busca lembranças passadas por espaço.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "space_id": {"type": "string", "default": "default"},
                        "limit": {"type": "integer", "default": 3}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "clear_memory",
                "description": "Zera toda a memória global (RAG). CUIDADO: Esta ação é irreversível.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "check_connectors",
                "description": "Verifica o status de disponibilidade dos conectores (Slack, Gmail, Agenda, etc).",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "unified_agenda",
                "description": "Consolida eventos de Trabalho e Pessoal para detectar conflitos.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string", "description": "ISO date for check"}
                    }
                }
            },
            {
                "name": "chrome_control",
                "description": "Ações no Chrome via porta de depuração remota.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "enum": ["open_window", "list_tabs", "extract_content"]},
                        "url": {"type": "string"}
                    },
                    "required": ["action"]
                }
            },
            {
                "name": "detect_hardware",
                "description": "Detecta especificações de hardware (RAM, CPU) para sugerir a melhor LLM.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        ])
    return {"tools": tools}

def call_tool(name, params):
    global table, db
    if name == "read_file":
        path = params.get("path")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return {"content": f.read()}
        except Exception as e:
            return {"error": str(e)}

    elif name == "web_search":
        return web_search(params.get("query"))

    elif name == "add_to_backlog":
        return add_to_backlog(params.get("title"), params.get("description"), params.get("priority", "Média"))

    elif name == "atlassian_rovo":
        return atlassian_query(params.get("query"), params.get("site_url"), params.get("email"), params.get("api_token"))

    elif name == "detect_hardware":
        return detect_hardware()

    elif name == "check_connectors":
        # Mock de simulação conforme solicitado (Alpha Phase)
        return {
            "slack": {"status": "success" if os.getenv("SLACK_TOKEN") else "warning", "msg": "Pronto" if os.getenv("SLACK_TOKEN") else "Pendente"},
            "gmail": {"status": "success" if os.getenv("GMAIL_TOKEN") else "warning", "msg": "Pronto" if os.getenv("GMAIL_TOKEN") else "Pendente"},
            "calendar": {"status": "success", "msg": "OK - Agenda Unificada Ativa"},
            "datadog": {"status": "pending", "msg": "Mock de Simulação Ativo"},
            "granola": {"status": "pending", "msg": "Mock de Simulação Ativo"},
            "ai_news": {"status": "success", "msg": "Feed Alpha Ativo"}
        }

    elif name == "unified_agenda":
        # Mock de conflito real para teste do Oráculo
        return [
            {"id": "1", "title": "Check-in Sprint Vela", "start": "2026-03-30T10:00:00", "end": "2026-03-30T11:00:00", "space": "work"},
            {"id": "2", "title": "Dentista (Pessoal)", "start": "2026-03-30T10:30:00", "end": "2026-03-30T12:00:00", "space": "personal"}
        ]

    elif name == "chrome_control":
        action = params.get("action")
        url = params.get("url", "https://google.com")
        try:
            if action == "open_window":
                # Tenta abrir o Chrome com porta de depuração remota se não estiver aberto
                # No macOS: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
                subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
                                 '--remote-debugging-port=9222', 
                                 '--new-window', url])
                return {"status": "success", "message": f"Janela do Chrome aberta em {url}"}
            return {"status": "error", "message": f"Ação {action} ainda não implementada no driver Alpha."}
        except Exception as e:
            return {"error": str(e)}

    elif name == "memory_store" and LANCEDB_AVAILABLE:
        try:
            table.add([{
                "text": params.get("content"),
                "role": params.get("role"),
                "space_id": params.get("space_id", "default"),
                "timestamp": datetime.datetime.now().isoformat(),
                "metadata": json.dumps(params.get("metadata", {}))
            }])
            return {"status": "stored"}
        except Exception as e:
            return {"error": str(e)}

    elif name == "memory_retrieve" and LANCEDB_AVAILABLE:
        try:
            query = params.get("query")
            space_id = params.get("space_id", "default")
            
            # Oráculo busca em tudo, outros buscam filtrado
            logging.info(f"RAG Retrieval: '{query}' em espaço '{space_id}'")
            search_op = table.search(query)
            if space_id != "oracle":
                search_op = search_op.where(f"space_id = '{space_id}'")
            
            results = search_op.limit(params.get("limit", 3)).to_list()
            
            # Filtro de relevância Alpha: Ignora se a distância for muito grande? 
            # (Opcional, mas por enquanto vamos confiar na filtragem de space_id).
            memories = [
                {"text": r["text"], "role": r["role"], "date": r["timestamp"]} 
                for r in results if "_distance" not in r or r["_distance"] < 1.0
            ]
            return {"memories": memories}
        except Exception as e:
            logging.error(f"Erro no RAG: {e}")
            return {"error": str(e)}

    elif name == "clear_memory" and LANCEDB_AVAILABLE:
        try:
            db.drop_table(TABLE_NAME)
            table = db.create_table(TABLE_NAME, schema=MemoryRecord)
            return {"status": "success", "message": "Global memory cleared."}
        except Exception as e:
            return {"error": str(e)}

    return {"error": f"Ferramenta '{name}' não disponível."}

def process_payload(payload_str):
    try:
        req = json.loads(payload_str)
        action = req.get("action")
        params = req.get("params", {})
        if action == "list_tools":
            return {"status": "success", "data": list_tools()}
        elif action == "check_health":
            return {
                "status": "success",
                "data": {
                    "lancedb": LANCEDB_AVAILABLE,
                    "dotenv": DOTENV_AVAILABLE,
                    "env_file": os.path.exists(".env"),
                    "tools_count": len(list_tools()["tools"]),
                    "debug": {
                        "executable": sys.executable,
                        "path": sys.path,
                        "version": sys.version,
                        "cwd": os.getcwd()
                    }
                }
            }
        elif action == "call_tool":
            tool_name = params.get("name")
            args = params.get("arguments", {})
            start_time = time.time()
            
            logging.info(f"Chamando Ferramenta: {tool_name} com args: {args}")
            result = call_tool(tool_name, args)
            
            duration = time.time() - start_time
            logging.info(f"Concluído: {tool_name} em {duration:.4f}s. Sucesso: {'error' not in result}")
            
            return {"status": "success", "data": result}
        return {"status": "error", "message": f"Ação '{action}' desconhecida."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main():
    if len(sys.argv) > 1:
        print(json.dumps(process_payload(sys.argv[1])))
        return
    while True:
        line = sys.stdin.readline()
        if not line: break
        line = line.strip()
        if not line: continue
        sys.stdout.write(json.dumps(process_payload(line)) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
