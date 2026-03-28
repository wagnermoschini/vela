import sys
import json
import logging

# Configuração simples de logging para stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] MCP Sidecar: %(message)s"
)

def process_mcp_message(message: str):
    """
    Função dummy para processar mensagens do Model Context Protocol.
    Aqui seria integrado o SDK real do MCP.
    """
    try:
        data = json.loads(message)
        logging.info(f"Recebido pedido MCP: {data.get('action', 'unknown')}")
        
        # Resposta mockada baseada na ação
        response = {
            "status": "success",
            "action_received": data.get("action", "unknown"),
            "data": "This is a dummy response from the Python MCP Sidecar."
        }
        return json.dumps(response)
    
    except json.JSONDecodeError:
        logging.error("Falha ao decodificar mensagem JSON do cliente Tauri.")
        return json.dumps({"status": "error", "message": "Invalid JSON format."})

def main():
    """
    Loop principal do sidecar que aguarda comandos via stdin e envia respostas via stdout.
    Tauri se comunicará com este projeto redirecionando I/O.
    """
    logging.info("Iniciando Vela MCP Sidecar (Python)... Aguardando comandos via stdin.")
    
    while True:
        try:
            # Lendo uma linha de cada vez do stdin (bloqueante)
            line = sys.stdin.readline()
            
            if not line:
                # EOF recebido (Tauri encerrou a conexão)
                logging.info("Conexão fechada. Encerrando Sidecar.")
                break
            
            line = line.strip()
            if not line: continue
            
            # Processa e responde
            response = process_mcp_message(line)
            sys.stdout.write(response + "\n")
            sys.stdout.flush() # Importante flushar para o Tauri ler imediatamente
            
        except KeyboardInterrupt:
            logging.info("Interrupção manual.")
            break
        except Exception as e:
            logging.error(f"Erro inesperado: {str(e)}")
            sys.stdout.write(json.dumps({"status": "error", "message": "Unexpected sidecar side error."}) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
