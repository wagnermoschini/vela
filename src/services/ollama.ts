export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaOptions {
  model: string;
  messages: Message[];
  onChunk: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export const ollamaService = {
  async chatStream({ model, messages, onChunk, onComplete, onError }: OllamaOptions) {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Ollama sends JSON chunks which can be multiple in one stream chunk
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              const contentChunk = json.message.content;
              fullText += contentChunk;
              onChunk(contentChunk);
            }
          } catch (e) {
            console.error('Error parsing JSON chunk:', e, line);
          }
        }
      }

      onComplete?.(fullText);
    } catch (error) {
      console.error('Ollama stream error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error during streaming'));
    }
  },
  async listLocalModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) return [];
      const data = await response.json();
      return data.models || [];
    } catch (e) {
      return [];
    }
  },

  async pullModelStream(name: string, onProgress: (percent: number, status: string) => void) {
    try {
      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, stream: true }),
      });

      if (!response.ok) throw new Error(`Pull error: ${response.statusText}`);
      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.total && json.completed) {
              const percent = Math.round((json.completed / json.total) * 100);
              onProgress(percent, json.status || 'Downloading...');
            } else {
              onProgress(0, json.status || 'Starting...');
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      throw error;
    }
  },

  async checkStatus() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};
