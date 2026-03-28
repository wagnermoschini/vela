import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Modal, Input, message, Tag, Divider, Tooltip } from 'antd';
import { 
  SlackOutlined, 
  ChromeOutlined, 
  GoogleOutlined,
  ApiOutlined,
  SettingOutlined,
  CheckCircleFilled,
  QuestionCircleOutlined,
  LaptopOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph, Link } = Typography;

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: { key: string; label: string; placeholder: string; isPassword?: boolean; help?: string }[];
}

const CONNECTORS: Connector[] = [
  {
    id: 'atlassian',
    name: 'Atlassian Rovo',
    description: 'Integre dados do Jira e Confluence na memória global do Vela.',
    icon: <ApiOutlined />,
    color: '#0052CC',
    fields: [
      { key: 'ATLASSIAN_EMAIL', label: 'E-mail Atlassian', placeholder: 'usuario@exemplo.com' },
      { key: 'ATLASSIAN_API_TOKEN', label: 'API Token', placeholder: 'Token gerado no ID Atlassian', isPassword: true, help: 'Gere em id.atlassian.com' },
      { key: 'ATLASSIAN_SITE_URL', label: 'Site URL', placeholder: 'meusite.atlassian.net' }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Permite que o Vela leia mensagens e interaja em canais do Slack.',
    icon: <SlackOutlined />,
    color: '#4A154B',
    fields: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot User OAuth Token', placeholder: 'xoxb-xxxx...', isPassword: true },
      { key: 'SLACK_APP_TOKEN', label: 'App-level Token (Socket Mode)', placeholder: 'xapp-xxxx...', isPassword: true }
    ]
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Acesse e-mails e organize sua caixa de entrada com IA.',
    icon: <GoogleOutlined />,
    color: '#EA4335',
    fields: [
      { key: 'GMAIL_API_KEY', label: 'API Key / Token', placeholder: 'Credenciais do Google Cloud', isPassword: true }
    ]
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    description: 'Controle o navegador, extraia dados e automatize tarefas na web.',
    icon: <ChromeOutlined />,
    color: '#4285F4',
    fields: [
      { key: 'CHROME_DEBUG_PORT', label: 'Remote Debugging Port', placeholder: '9222 (padrão)' }
    ]
  },
  {
    id: 'granola',
    name: 'Granola',
    description: 'Sincronize notas de reuniões e transcrições para o seu segundo cérebro.',
    icon: <LaptopOutlined />,
    color: '#000000',
    fields: [
      { key: 'GRANOLA_API_KEY', label: 'Granola API Key', placeholder: 'Sua chave de acesso', isPassword: true }
    ]
  }
];

export const ConnectorsView: React.FC = () => {
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const openConfig = (connector: Connector) => {
    setSelectedConnector(connector);
    setFormData({});
  };

  const handleSave = async () => {
    if (!selectedConnector) return;
    
    setLoading(true);
    try {
      for (const field of selectedConnector.fields) {
        const val = formData[field.key];
        if (val) {
          await invoke('save_env_key', { key: field.key, value: val.trim() });
        }
      }
      message.success(`${selectedConnector.name} configurado com sucesso!`);
      setSelectedConnector(null);
    } catch (err) {
      message.error('Erro ao salvar configurações no .env');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2}>Central de Conectores</Title>
        <Paragraph type="secondary" style={{ fontSize: '1.1rem' }}>
          Conecte o Vela às suas ferramentas de trabalho favoritas via MCP. 
          As credenciais são salvas localmente no seu arquivo <code>.env</code>.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {CONNECTORS.map(conn => (
          <Col xs={24} sm={12} lg={8} key={conn.id}>
            <Card 
              hoverable 
              bordered={false}
              style={{ 
                borderRadius: 16, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: `${conn.color}15`, color: conn.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginRight: 16
                }}>
                  {conn.icon}
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>{conn.name}</Title>
                  <Tag bordered={false} color="default" style={{ fontSize: '0.7rem' }}>MCP Connector</Tag>
                </div>
              </div>
              
              <Paragraph type="secondary" style={{ flex: 1, fontSize: '0.9rem', marginBottom: 20 }}>
                {conn.description}
              </Paragraph>

              <Button 
                block 
                type="primary" 
                ghost 
                variant="outlined"
                icon={<SettingOutlined />}
                onClick={() => openConfig(conn)}
                style={{ borderRadius: 8, height: 40 }}
              >
                Configurar
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title={
          <Space>
            <div style={{ color: selectedConnector?.color }}>{selectedConnector?.icon}</div>
            <span>Configurar {selectedConnector?.name}</span>
          </Space>
        }
        open={!!selectedConnector}
        onCancel={() => setSelectedConnector(null)}
        onOk={handleSave}
        confirmLoading={loading}
        okText="Salvar Alterações"
        cancelText="Cancelar"
        width={500}
        centered
        style={{ borderRadius: 16 }}
      >
        <div style={{ padding: '8px 0' }}>
          <Paragraph type="secondary" style={{ fontSize: '0.85rem', marginBottom: 24 }}>
            Insira as informações abaixo. Elas serão salvas no seu arquivo <code>.env</code> local.
          </Paragraph>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {selectedConnector?.fields.map(field => (
              <div key={field.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>{field.label}</Text>
                  {field.help && (
                    <Tooltip title={field.help}>
                      <QuestionCircleOutlined style={{ color: '#bfbfbf', cursor: 'pointer' }} />
                    </Tooltip>
                  )}
                </div>
                {field.isPassword ? (
                  <Input.Password 
                    placeholder={field.placeholder} 
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                ) : (
                  <Input 
                    placeholder={field.placeholder} 
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    size="large"
                    style={{ borderRadius: 8 }}
                  />
                )}
              </div>
            ))}
          </Space>

          <Divider />
          
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: 8, display: 'flex', gap: 12 }}>
             <CheckCircleFilled style={{ color: '#52c41a', marginTop: 4 }} />
             <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                O Vela utiliza criptografia de ponta-a-ponta. Suas chaves nunca saem da sua máquina.
             </Text>
          </div>
        </div>
      </Modal>

      <div style={{ marginTop: 60, textAlign: 'center', paddingBottom: 40 }}>
         <Text type="secondary">Precisa de um conector personalizado? </Text>
         <Link href="https://github.com/wagnermoschini/vela" target="_blank">Saiba como criar o seu.</Link>
      </div>
    </div>
  );
};
