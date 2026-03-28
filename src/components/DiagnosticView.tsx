import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Badge, List, Typography, Button, Space, Tag, Collapse } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SyncOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  BugOutlined
} from '@ant-design/icons';
import { ollamaService } from '../services/ollama';
import { mcpService } from '../services/mcpService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export const DiagnosticView: React.FC = () => {
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [mcpHealth, setMcpHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const checkAll = async () => {
    setLoading(true);
    setRawError(null);
    try {
      const oStatus = await ollamaService.checkStatus();
      setOllamaOk(oStatus);
      
      const mHealth = await mcpService.checkHealth();
      setMcpHealth(mHealth);
      if (!mHealth) setRawError("O sidecar não retornou dados de saúde (null).");
    } catch (e: any) {
      console.error('Diagnostic error', e);
      setRawError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAll();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Centro de Diagnóstico</Title>
          <Text type="secondary">Verifique o status de todos os subsistemas do Vela.</Text>
        </div>
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={loading} />} 
          onClick={checkAll}
          disabled={loading}
        >
          Atualizar Status
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card hoverable bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Ollama Server"
              value={ollamaOk ? "Online" : "Offline"}
              valueStyle={{ color: ollamaOk ? '#3f8600' : '#cf1322' }}
              prefix={ollamaOk ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Badge status={ollamaOk ? "success" : "error"} text={ollamaOk ? "Porta 11434 Ativa" : "Ollama não detectado"} />
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="MCP Sidecar"
              value={mcpHealth ? "Rodando" : "Erro"}
              valueStyle={{ color: mcpHealth ? '#1890ff' : '#cf1322' }}
              prefix={<ThunderboltOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Tools: </Text>
              <Tag color="blue">{mcpHealth?.tools_count || 0} detectadas</Tag>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Memória RAG"
              value={mcpHealth?.lancedb ? "Ativa" : "Inativa"}
              valueStyle={{ color: mcpHealth?.lancedb ? '#722ed1' : '#cf1322' }}
              prefix={<DatabaseOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Badge status={mcpHealth?.lancedb ? "success" : "default"} text="LanceDB Operacional" />
            </div>
          </Card>
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 32 }}>Detalhes da Configuração</Title>
      <List
        size="small"
        bordered
        style={{ background: '#fff' }}
      >
        <List.Item>
          <Space>
            <Text strong>Arquivo .env:</Text>
            {mcpHealth?.env_file ? <Tag color="success">Presente</Tag> : <Tag color="warning">Ausente</Tag>}
          </Space>
        </List.Item>
        <List.Item>
          <Space>
            <Text strong>Dotenv Python:</Text>
            {mcpHealth?.dotenv ? <Tag color="success">Instalado</Tag> : <Tag color="error">Não instalado</Tag>}
          </Space>
        </List.Item>
        <List.Item>
          <Space>
            <Text strong>Contexto Local:</Text>
            <Text type="secondary">{window.location.origin}</Text>
          </Space>
        </List.Item>
      </List>

      {rawError && (
        <div style={{ marginTop: 24, padding: '12px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8 }}>
          <Text type="danger" strong><CloseCircleOutlined /> Erro Bruto do Sidecar:</Text>
          <pre style={{ marginTop: 8, fontSize: '11px', whiteSpace: 'pre-wrap' }}>{rawError}</pre>
        </div>
      )}

      {mcpHealth?.debug && (
        <Collapse ghost style={{ marginTop: 24, background: '#fafafa', borderRadius: 8 }}>
          <Panel header={<span><BugOutlined /> Depuração de Ambiente (JSON)</span>} key="1">
            <pre style={{ fontSize: '11px', overflowX: 'auto' }}>
              {JSON.stringify(mcpHealth.debug, null, 2)}
            </pre>
          </Panel>
        </Collapse>
      )}

      <div style={{ marginTop: 40, padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
        <Title level={5}>Dica de Troubleshooting</Title>
        <Text>
          Se o Sidecar ou o LanceDB estiverem offline, certifique-se de que o Python está no PATH e que você executou:
          <br />
          <code>pip install lancedb tavily-python python-dotenv ollama</code>
        </Text>
      </div>
    </div>
  );
};
