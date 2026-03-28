import { invoke } from '@tauri-apps/api/core';

export interface McpTool {
  name: string;
  description: string;
  parameters: any;
}

export interface McpResponse {
  status: string;
  data: any;
  message?: string;
}

/**
 * Serviço que orquestra chamadas para o sidecar Python via Tauri Rust.
 */
export const mcpService = {
  /**
   * Lista as ferramentas disponíveis no sidecar.
   */
  async listTools(): Promise<McpTool[]> {
    try {
      const response: McpResponse = await invoke('call_mcp_tool', {
        request: {
          action: 'list_tools',
          params: {}
        }
      });

      if (response.status === 'success') {
        return response.data.tools || [];
      }
      console.error('MCP Error:', response.message);
      return [];
    } catch (error) {
      console.error('Failed to list MCP tools:', error);
      return [];
    }
  },

  /**
   * Chama uma ferramenta específica do sidecar.
   */
  async callTool(name: string, arguments_obj: any): Promise<any> {
    try {
      const response: McpResponse = await invoke('call_mcp_tool', {
        request: {
          action: 'call_tool',
          params: {
            name,
            arguments: arguments_obj
          }
        }
      });

      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.message || 'Unknown MCP error');
    } catch (error) {
      console.error(`Failed to call MCP tool ${name}:`, error);
      throw error;
    }
  },

  async checkHealth(): Promise<any> {
    try {
      const response: McpResponse = await invoke('call_mcp_tool', {
        request: {
          action: 'check_health',
          params: {}
        }
      });
      if (response.status === 'success') {
        return response.data;
      }
      throw new Error(response.message || 'Erro desconhecido no sidecar');
    } catch (error: any) {
      console.error('Failed to check MCP health:', error);
      throw error;
    }
  }
};
