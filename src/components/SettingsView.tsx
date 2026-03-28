import React, { useState } from 'react';
import { Card, Typography, Switch, Button, Space, Divider, message, Alert, Popconfirm } from 'antd';
import { 
  HistoryOutlined, 
  DeleteOutlined, 
  CloudSyncOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { mcpService } from '../services/mcpService';

const { Title, Text, Paragraph } = Typography;

export const SettingsView: React.FC = () => {
  const [persistHistory, setPersistHistory] = useState(() => {
    return localStorage.getItem('vela_persist_history') !== 'false';
  });
  const [loading, setLoading] = useState(false);

  const handlePersistToggle = (checked: boolean) => {
    setPersistHistory(checked);
    localStorage.setItem('vela_persist_history', String(checked));
    if (!checked) {
      localStorage.removeItem('vela_chat_history');
      message.info('Persistência desativada. Histórico local removido.');
    } else {
      message.success('Persistência de histórico ativada.');
    }
  };

  const clearChat = () => {
    localStorage.removeItem('vela_chat_history');
    message.success('Histórico de chat limpo.');
    window.location.reload(); // Reload to clear current state
  };

  const clearGlobalMemory = async () => {
    setLoading(true);
    try {
      await mcpService.callTool('clear_memory', {});
      message.success('Memória Global (RAG) foi resetada com sucesso.');
    } catch (err) {
      message.error('Erro ao limpar memória global: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>Configurações</Title>
        <Paragraph type="secondary" style={{ fontSize: '1.1rem' }}>
          Gerencie suas preferências de privacidade, persistência e memória do Vela.
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Privacidade e Persistência */}
        <Card 
          title={<Space><HistoryOutlined /> <span>Privacidade e Histórico</span></Space>}
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <Text strong style={{ fontSize: '1rem' }}>Persistir Histórico de Chat</Text>
              <br />
              <Text type="secondary">Salva suas conversas localmente para que estejam disponíveis ao reiniciar o app.</Text>
            </div>
            <Switch checked={persistHistory} onChange={handlePersistToggle} />
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Limpar Chat Atual</Text>
              <br />
              <Text type="secondary">Remove todas as mensagens da sua visão atual e do armazenamento local.</Text>
            </div>
            <Popconfirm
              title="Limpar Histórico?"
              description="Isso apagará todas as mensagens visualizadas até agora. Continuar?"
              onConfirm={clearChat}
              okText="Sim, Limpar"
              cancelText="Cancelar"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button danger icon={<DeleteOutlined />}>Limpar Chat</Button>
            </Popconfirm>
          </div>
        </Card>

        {/* Memória Global (RAG) */}
        <Card 
          title={<Space><DatabaseOutlined /> <span>Memória Global (RAG)</span></Space>}
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
        >
          <Paragraph type="secondary">
            O Vela armazena fatos importantes no banco de dados vetorial local (**LanceDB**) para fornecer contexto em conversas futuras.
          </Paragraph>

          <Alert 
            type="warning"
            showIcon
            message="Ação Irreversível"
            description="Ao zerar a memória global, o Vela esquecerá tudo o que aprendeu sobre você e seus projetos em conversas passadas."
            style={{ marginBottom: 24, borderRadius: 8 }}
          />

          <Popconfirm
            title="Resetar Memória Global?"
            description="Toda a inteligência acumulada será perdida. Tem certeza?"
            onConfirm={clearGlobalMemory}
            okText="Zerar Agora"
            cancelText="Cancelar"
            okButtonProps={{ danger: true, loading }}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
          >
            <Button block danger type="dashed" size="large" icon={<CloudSyncOutlined />}>
              Zerar Memória Global do Vela
            </Button>
          </Popconfirm>
        </Card>

        {/* Segurança */}
        <div style={{ background: '#f0f7ff', padding: '24px', borderRadius: 16, border: '1px solid #bae7ff' }}>
          <Space align="start">
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <div>
               <Text strong style={{ fontSize: '1.1rem', color: '#003a8c' }}>Segurança Local Ativa</Text>
               <br />
               <Text style={{ color: '#003a8c' }}>
                  Todos os seus dados de chat e memória estão armazenados em: 
                  <code> {`~/vela/data/`}</code>. Nenhum dado de inteligência é enviado para servidores externos.
               </Text>
            </div>
          </Space>
        </div>
      </Space>

      <div style={{ marginTop: 40, textAlign: 'center', opacity: 0.5 }}>
         <Text type="secondary">Vela v0.1.0 • Local Identity: {window.crypto.randomUUID().slice(0, 8)}</Text>
      </div>
    </div>
  );
};
