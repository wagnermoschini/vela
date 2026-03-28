import React, { useState, useRef, useEffect } from 'react';
import { Layout, Typography, Menu, Button, Space, Divider, Segmented, Badge, message } from 'antd';
import { Sender, Bubble } from '@ant-design/x';
import { 
  FolderOpenOutlined, 
  MessageOutlined, 
  CodeOutlined, 
  PlusOutlined, 
  AppstoreOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Sandpack } from '@codesandbox/sandpack-react';
import { SkillsLibrary } from './components/SkillsLibrary';
import { DiagnosticView } from './components/DiagnosticView';
import { ollamaService } from './services/ollama';
import { mcpService } from './services/mcpService';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export const MainLayout: React.FC = () => {
  const [sandpackVisible, setSandpackVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'skills' | 'diagnostic'>('chat');
  const [mode, setMode] = useState<'co-work' | 'code'>('co-work');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const [messages, setMessages] = useState<any[]>([
    {
      key: '1',
      content: 'Olá! Sou o Vela. Como posso ajudar você hoje?',
      role: 'ai',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMsg = {
      key: Date.now().toString(),
      content: inputValue,
      role: 'user',
    };

    const assistantKey = (Date.now() + 1).toString();
    const assistantMsg = {
      key: assistantKey,
      content: '', // Start empty for streaming
      role: 'ai',
      loading: true
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue('');
    setIsStreaming(true);

    const targetModel = mode === 'co-work' ? 'llama3.1:8b' : 'qwen2.5-coder:7b';
    
    // Convert current messages to Ollama format
    const chatHistory = messages
      .filter(m => !m.loading)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant' as any,
        content: m.content
      }));
    
    chatHistory.push({ role: 'user', content: userMsg.content });

    try {
      // 1. Busca Semântica (Recuperação de Memória)
      let contextPrefix = "";
      try {
        const memoryResults = await mcpService.callTool('memory_retrieve', { query: inputValue, limit: 2 });
        if (memoryResults && memoryResults.memories?.length > 0) {
          const memoriesStr = memoryResults.memories
            .map((m: any) => `[Em ${m.date}, você disse: ${m.text}]`)
            .join('\n');
          contextPrefix = `### CONTEXTO DO PASSADO (Lembre-se disso):\n${memoriesStr}\n\n`;
          console.info('Contexto recuperado:', contextPrefix);
        }
      } catch (memErr) {
        console.warn('Falha na recuperação de memória:', memErr);
      }

    const finalHistory = [...chatHistory];
    if (contextPrefix) {
        // Injeta o contexto na última mensagem do usuário ou como uma mensagem de sistema
        finalHistory[finalHistory.length - 1].content = contextPrefix + finalHistory[finalHistory.length - 1].content;
    }

      await ollamaService.chatStream({
        model: targetModel,
        messages: finalHistory,
        onChunk: (chunk) => {
          setMessages(prev => prev.map(m => 
            m.key === assistantKey 
              ? { ...m, content: m.content + chunk, loading: false }
              : m
          ));
        },
        onComplete: async (fullText) => {
          setIsStreaming(false);
          // 2. Persistência Automática (Memorização)
          try {
            // Salva a pergunta do usuário
            await mcpService.callTool('memory_store', { content: inputValue, role: 'user' });
            // Salva a resposta da IA
            await mcpService.callTool('memory_store', { content: fullText, role: 'assistant' });
          } catch (storeErr) {
            console.warn('Falha ao salvar na memória:', storeErr);
          }
        },
        onError: (err) => {
          setIsStreaming(false);
          message.error(`Erro ao conectar com Ollama: ${err.message}. Verifique se o Ollama está rodando.`);
          setMessages(prev => prev.map(m => 
            m.key === assistantKey 
              ? { ...m, content: 'Erro ao obter resposta. Verifique sua conexão local com o Ollama.', loading: false }
              : m
          ));
        }
      });
    } catch (e) {
      setIsStreaming(false);
    }
  };

  return (
    <Layout style={{ height: '100%', width: '100%', background: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <Sider 
        width={260} 
        theme="light" 
        style={{ 
          borderRight: '1px solid var(--border-color)', 
          background: 'var(--bg-color)' 
        }}
      >
        <div style={{ padding: 'var(--spacing-base)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 16 }}>
             <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  block 
                  style={{ height: 40, borderRadius: 8, fontWeight: 500 }}
                  onClick={() => {
                    setActiveTab('chat');
                    setMessages([{ key: '1', content: 'Nova sessão iniciada. Como posso ajudar?', role: 'ai' }]);
                  }}
                >
                  New Project
                </Button>
                <Button 
                  icon={<AppstoreOutlined />} 
                  block 
                  style={{ height: 40, borderRadius: 8 }}
                  onClick={() => setActiveTab('skills')}
                >
                  Skills Library
                </Button>
             </Space>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderOpenOutlined style={{ color: '#8c8c8c' }} />
              <Text strong style={{ fontSize: '0.8rem', color: '#8c8c8c', textTransform: 'uppercase' }}>Recent Projects</Text>
            </div>
            <Menu 
              mode="inline" 
              selectedKeys={[activeTab === 'chat' ? 'chat-1' : (activeTab === 'skills' ? 'skills' : 'diagnostic')]}
              style={{ background: 'transparent', border: 'none' }}
              items={[
                { key: 'chat-1', icon: <MessageOutlined />, label: 'Vela Workspace' },
                { type: 'divider' },
                { key: 'skills', icon: <AppstoreOutlined />, label: 'All Skills (MCP)' },
                { key: 'diagnostic', icon: <SettingOutlined />, label: 'Diagnostics' },
                { key: 'history', icon: <HistoryOutlined />, label: 'Full History' },
              ]}
              onClick={({ key }) => {
                if (key === 'skills') setActiveTab('skills');
                else if (key === 'diagnostic') setActiveTab('diagnostic');
                else setActiveTab('chat');
              }}
            />
          </div>
          
          <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: '0.75rem' }}>Vela v0.1.0</Text>
            <Badge status="processing" text={<Text type="secondary" style={{ fontSize: '0.75rem' }}>Ollama Local</Text>} />
          </div>
        </div>
      </Sider>

      {/* Main Content Area */}
      <Content style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        {activeTab === 'chat' ? (
          <>
            <div style={{ 
              padding: '12px 24px', 
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.5)'
            }}>
              <Space size="large">
                <Title level={5} style={{ margin: 0 }}>Workspace</Title>
                <Segmented
                  value={mode}
                  onChange={(val: any) => setMode(val)}
                  options={[
                    { label: 'Vela Co-work', value: 'co-work', icon: <ThunderboltOutlined /> },
                    { label: 'Vela Code', value: 'code', icon: <CodeOutlined /> },
                  ]}
                  style={{ borderRadius: 8 }}
                />
              </Space>
              
              <Button 
                icon={<CodeOutlined />} 
                onClick={() => setSandpackVisible(!sandpackVisible)}
                type={sandpackVisible ? 'primary' : 'default'}
              >
                Artifacts
              </Button>
            </div>
            
            <div 
              ref={scrollRef}
              style={{ 
                flex: 1, 
                padding: '24px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
                {messages.map(msg => (
                  <Bubble 
                    key={msg.key} 
                    content={msg.content || (msg.loading ? 'Processando...' : '')} 
                    placement={msg.role === 'user' ? 'end' : 'start'}
                    loading={msg.loading}
                    style={{
                      marginBottom: '1.5rem',
                      opacity: 0.95,
                      maxWidth: '85%'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
              <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <Sender 
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSend}
                  loading={isStreaming}
                  placeholder={mode === 'co-work' ? "Converse com Llama 3.1..." : "Codifique com Qwen 2.5 Coder..."}
                  style={{
                     boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                     borderRadius: 12,
                     padding: '8px'
                  }}
                />
              </div>
            </div>
          </>
        ) : activeTab === 'skills' ? (
          <SkillsLibrary />
        ) : (
          <DiagnosticView />
        )}
      </Content>

      {/* Artifacts (Sandpack) Area */}
      {sandpackVisible && activeTab === 'chat' && (
        <Sider 
          width={500}
          theme="light"
          style={{ 
            borderLeft: '1px solid var(--border-color)', 
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: 'var(--spacing-base)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong>Live Preview</Text>
              <Button size="small" type="text" onClick={() => setSandpackVisible(false)}>Fechar</Button>
            </div>
            <div style={{ height: 'calc(100% - 40px)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <Sandpack 
                 template="react-ts" 
                 theme="auto"
                 options={{
                   editorHeight: '100%',
                   showNavigator: true,
                 }}
              />
            </div>
          </div>
        </Sider>
      )}
    </Layout>
  );
};
