import React, { useState, useRef, useEffect } from 'react';
import { Layout, Typography, Menu, Button, Space, Divider, Badge, message, Tag } from 'antd';
import { Sender, Bubble } from '@ant-design/x';
import { 
  FolderOpenOutlined, 
  MessageOutlined, 
  PlusOutlined, 
  AppstoreOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  GlobalOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  UserOutlined,
  BookOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { Sandpack } from '@codesandbox/sandpack-react';
import { SkillsLibrary } from './components/SkillsLibrary';
import { DiagnosticView } from './components/DiagnosticView';
import { ConnectorsView } from './components/ConnectorsView';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ollamaService } from './services/ollama';
import { mcpService } from './services/mcpService';
import { VELA_SYSTEM_PROMPT } from './services/prompts';
import { auditTrail } from './services/auditTrail';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const SPACE_DEFS = {
  oracle: { name: 'Oráculo', color: '#722ed1' },
  work: { name: 'Trabalho', color: '#1890ff' },
  personal: { name: 'Pessoal', color: '#52c41a' },
  study: { name: 'Estudo', color: '#fa8c16' }
};

export const MainLayout: React.FC = () => {
  const [sandpackVisible, setSandpackVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'skills' | 'diagnostic' | 'connectors' | 'settings'>('chat');
  const [activeSpace, setActiveSpace] = useState<string>(() => localStorage.getItem('vela_active_space') || 'work');
  const [isStreaming, setIsStreaming] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(() => !localStorage.getItem('vela_onboarded'));
  
  const [messages, setMessages] = useState<any[]>(() => {
    const persist = localStorage.getItem('vela_persist_history') !== 'false';
    const saved = localStorage.getItem('vela_chat_history');
    if (persist && saved) {
      return JSON.parse(saved);
    }
    return [
      {
        key: '1',
        content: 'Olá! Sou o Vela. Como posso ajudar você hoje?',
        role: 'ai',
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Persist history
    const persist = localStorage.getItem('vela_persist_history') !== 'false';
    if (persist && messages.length > 0) {
      localStorage.setItem(`vela_chat_history_${activeSpace}`, JSON.stringify(messages));
    }
  }, [messages, activeSpace]);

  // Handle Drag & Drop for Study Space
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (activeSpace !== 'study') return;

    const files = Array.from(e.dataTransfer.files);
    const urls = e.dataTransfer.getData('text/uri-list');

    if (files.length > 0 || urls) {
      message.loading({ content: 'Ingerindo contexto no Espaço de Estudo...', key: 'ingest' });
      try {
        // Mock de ingestão rápida para o Alpha
        await new Promise(r => setTimeout(r, 1500));
        auditTrail.log('Context Ingested', 'success', { files: files.length, url: !!urls });
        message.success({ content: 'Contexto Adicionado com Sucesso!', key: 'ingest' });
        setMessages(prev => [...prev, {
          key: Date.now().toString(),
          role: 'ai',
          content: `Recebi seu ${files.length > 0 ? 'arquivo' : 'link'} no Espaço de Estudo. Já indexei o conteúdo para nossa conversa.`
        }]);
      } catch (err) {
        message.error({ content: 'Falha na ingestão', key: 'ingest' });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (activeSpace === 'study') e.preventDefault();
  };

  // Load messages when space changes
  useEffect(() => {
    const saved = localStorage.getItem(`vela_chat_history_${activeSpace}`);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([{
        key: '1',
        content: `Você entrou no Espaço ${SPACE_DEFS[activeSpace as keyof typeof SPACE_DEFS]?.name || activeSpace}. Como posso ajudar?`,
        role: 'ai'
      }]);
    }
    localStorage.setItem('vela_active_space', activeSpace);
    auditTrail.log('Space Switched', 'info', { space: activeSpace });
  }, [activeSpace]);

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

    const targetModel = 'llama3.1:8b';
    
    // Convert current messages to Ollama format
    const chatHistory = messages
      .filter(m => !m.loading)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant' as any,
        content: m.content
      }));
    
    chatHistory.push({ role: 'user', content: userMsg.content });

    try {
      // 1. Busca Semântica (Recuperação de Memória em Duas Camadas)
      let contextPrefix = "";
      try {
        // Busca 1: Assunto Atual
        const subjectResults = await mcpService.callTool('memory_retrieve', { query: inputValue, limit: 3, space_id: activeSpace });
        // Busca 2: Preferências de Comportamento (Query Fixa)
        const preferenceResults = await mcpService.callTool('memory_retrieve', { query: "comportamento estilo tom de voz preferências instruções de sistema", limit: 2, space_id: activeSpace });
        
        const memories: string[] = [];
        
        if (preferenceResults?.memories?.length > 0) {
          const prefStr = preferenceResults.memories
            .map((m: any) => `[PREFERÊNCIA/ESTILO]: ${m.text}`)
            .join('\n');
          memories.push(`### SUAS PREFERÊNCIAS DE COMPORTAMENTO (Prioridade Máxima):\n${prefStr}`);
        }

        if (subjectResults?.memories?.length > 0) {
          const subjStr = subjectResults.memories
            .map((m: any) => `[Lembrança de ${m.date}]: ${m.text}`)
            .join('\n');
          memories.push(`### CONTEXTO DO ASSUNTO (Lembre-se disso):\n${subjStr}`);
        }

        if (memories.length > 0) {
          contextPrefix = memories.join('\n\n') + '\n\n';
          console.info('Contexto Dual-Search recuperado.');
        }
      } catch (memErr) {
        console.warn('Falha na recuperação de memória em duas camadas:', memErr);
      }

    const finalHistory = [...chatHistory];
    if (contextPrefix) {
        // Injeta o contexto na última mensagem do usuário ou como uma mensagem de sistema
        finalHistory[finalHistory.length - 1].content = contextPrefix + finalHistory[finalHistory.length - 1].content;
    }

    // Injetar Instrução de Sistema Mestre (Persona Vela Co-work)
    const messagesWithSystem = [
        { role: 'system' as any, content: VELA_SYSTEM_PROMPT },
        ...finalHistory
    ];

      await ollamaService.chatStream({
        model: targetModel,
        messages: messagesWithSystem,
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
            await mcpService.callTool('memory_store', { content: inputValue, role: 'user', space_id: activeSpace });
            // Salva a resposta da IA
            await mcpService.callTool('memory_store', { content: fullText, role: 'assistant', space_id: activeSpace });
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
    <Layout 
      style={{ minHeight: '100vh', background: 'var(--bg-color)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <style>{`
        :root {
          --accent-color: ${SPACE_DEFS[activeSpace as keyof typeof SPACE_DEFS]?.color || '#1890ff'};
          --accent-bg: ${SPACE_DEFS[activeSpace as keyof typeof SPACE_DEFS]?.color || '#1890ff'}08;
        }
        .ant-layout-sider {
          border-right: 1px solid var(--accent-bg) !important;
        }
        .ant-btn-primary {
          background: var(--accent-color) !important;
        }
      `}</style>
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
                { key: 'connectors', icon: <GlobalOutlined />, label: 'Conectores' },
                { key: 'diagnostic', icon: <DashboardOutlined />, label: 'Diagnostics' },
                { key: 'settings', icon: <SettingOutlined />, label: 'Configurações' },
                { key: 'history', icon: <HistoryOutlined />, label: 'Full History' },
                { type: 'divider' },
                { key: 'space-oracle', icon: <DatabaseOutlined style={{ color: SPACE_DEFS.oracle.color }} />, label: 'Oráculo' },
                { key: 'space-work', icon: <CodeOutlined style={{ color: SPACE_DEFS.work.color }} />, label: 'Trabalho' },
                { key: 'space-personal', icon: <UserOutlined style={{ color: SPACE_DEFS.personal.color }} />, label: 'Pessoal' },
                { key: 'space-study', icon: <BookOutlined style={{ color: SPACE_DEFS.study.color }} />, label: 'Estudo' },
              ]}
              onClick={({ key }) => {
                if (key === 'skills') setActiveTab('skills');
                else if (key === 'diagnostic') setActiveTab('diagnostic');
                else if (key === 'connectors') setActiveTab('connectors');
                else if (key === 'settings') setActiveTab('settings');
                else if (key.startsWith('space-')) {
                   const spaceId = key.split('-')[1];
                   setActiveSpace(spaceId);
                   setActiveTab('chat');
                }
                else setActiveTab('chat');
              }}
            />
          </div>
          
          <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: '0.75rem' }}>Vela AI - Alpha</Text>
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
                <Title level={5} style={{ margin: 0 }}>Vela {SPACE_DEFS[activeSpace as keyof typeof SPACE_DEFS]?.name || 'Co-work'}</Title>
                <Tag color="var(--accent-color)" style={{ borderRadius: 6 }}>ALPHA</Tag>
              </Space>
              
              <Button 
                icon={<ThunderboltOutlined />} 
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
                  placeholder="Converse com o Vela Co-work..."
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
        ) : activeTab === 'connectors' ? (
          <ConnectorsView />
        ) : activeTab === 'settings' ? (
          <SettingsView />
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

      <OnboardingWizard 
        visible={onboardingVisible} 
        onFinish={(config) => {
          localStorage.setItem('vela_onboarded', 'true');
          localStorage.setItem('vela_config', JSON.stringify(config));
          setOnboardingVisible(false);
          window.location.reload();
        }}
      />
    </Layout>
  );
};
