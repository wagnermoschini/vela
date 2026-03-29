import React, { useState, useEffect } from 'react';
import { Modal, Typography, Card, Space, Button, Progress, message, Steps, Tag, Row, Col, Alert, Checkbox, List, Avatar } from 'antd';
import { 
  RocketOutlined, 
  ThunderboltOutlined, 
  DatabaseOutlined, 
  GlobalOutlined,
  CheckOutlined,
  LoadingOutlined,
  DesktopOutlined,
  CodeOutlined,
  BookOutlined,
  UserOutlined,
  SlackOutlined,
  MailOutlined,
  CalendarOutlined,
  LineChartOutlined,
  ChromeOutlined,
  ApiOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { ollamaService } from '../services/ollama';
import { mcpService } from '../services/mcpService';
import { auditTrail } from '../services/auditTrail';

const { Title, Text, Paragraph } = Typography;

interface OnboardingWizardProps {
  visible: boolean;
  onFinish: (config: any) => void;
}

const SPACES = [
  { id: 'oracle', name: 'Oráculo', icon: <DatabaseOutlined />, desc: 'Cérebro central. Agrega todo o conhecimento de todos os espaços.', color: '#722ed1' },
  { id: 'work', name: 'Trabalho', icon: <CodeOutlined />, desc: 'Tarefas profissionais, conectores MCP e automação de sistema.', color: '#1890ff' },
  { id: 'personal', name: 'Pessoal', icon: <UserOutlined />, desc: 'Privacidade total. Separado do contexto de trabalho.', color: '#52c41a' },
  { id: 'study', name: 'Estudo', icon: <BookOutlined />, desc: 'Estudo profundo de documentos, vídeos e páginas web.', color: '#fa8c16' }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ visible, onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [ollamaReady, setOllamaReady] = useState(false);
  const [hardware, setHardware] = useState<any>(null);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(['oracle', 'work']);
  const [suggestedModels, setSuggestedModels] = useState<any[]>([]);
  const [provisioning, setProvisioning] = useState(false);
  const [installStatus, setInstallStatus] = useState<Record<string, { percent: number, status: string }>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState<any>(null);

  // Poll for Ollama
  useEffect(() => {
    let interval: any;
    if (visible && currentStep === 0) {
      interval = setInterval(async () => {
        const up = await ollamaService.checkStatus();
        if (up && !ollamaReady) {
          setOllamaReady(true);
          auditTrail.log('Ollama Watchdog', 'success', { status: 'detected' });
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [visible, currentStep]);

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    setCurrentStep(1);
    try {
      // 1. Detect Hardware
      auditTrail.log('Hardware Diagnostic', 'info', { action: 'start' });
      const hw = await mcpService.callTool('detect_hardware', {});
      setHardware(hw);
      auditTrail.log('Hardware Diagnostic', 'success', hw);

      // 2. Install Meta-LLM (Phi3)
      auditTrail.log('Meta-LLM Provisioning', 'info', { model: 'phi3:mini', action: 'start' });
      setInstallStatus(prev => ({ ...prev, 'phi3:mini': { percent: 0, status: 'Preparando Consultor...' } }));
      await ollamaService.pullModelStream('phi3:mini', (percent, status) => {
        setInstallStatus(prev => ({ ...prev, 'phi3:mini': { percent, status } }));
      });
      auditTrail.log('Meta-LLM Provisioning', 'success', { model: 'phi3:mini' });

      // 3. Consult LLM for best models
      setSuggestedModels([
        { id: (hw.ram_gb || 0) > 16 ? 'llama3:8b' : 'llama3:7b', space: 'oracle', name: 'Vela Oráculo', reason: 'Melhor raciocínio para agregação global.' },
        { id: 'mistral:latest', space: 'work', name: 'Vela Work', reason: 'Versátil para MCP e automação.' },
        { id: 'phi3:mini', space: 'personal', name: 'Vela Personal', reason: 'Leve e 100% privado.' },
        { id: (hw.ram_gb || 0) > 24 ? 'command-r' : 'mistral', space: 'study', name: 'Vela Study', reason: 'Excelente para documentos e RAG longo.' }
      ]);
      
      setIsAnalyzing(false);
    } catch (err) {
      auditTrail.log('Onboarding Error', 'error', { step: 'Analysis', message: String(err) });
      message.error('Falha no diagnóstico: ' + String(err));
      setIsAnalyzing(false);
    }
  };

  const handleCheckConnectors = async () => {
    setIsAnalyzing(true);
    try {
      const status = await mcpService.callTool('check_connectors', {});
      setConnectorStatus(status);
      auditTrail.log('Connectors Audit', 'info', status);
      setIsAnalyzing(false);
    } catch (err) {
      console.error('Failed to check connectors:', err);
      setIsAnalyzing(false);
    }
  };

  const startProvisioning = async () => {
    setProvisioning(true);
    const modelsToInstall = suggestedModels.filter(m => selectedSpaces.includes(m.space));
    
    for (const model of modelsToInstall) {
      try {
        await ollamaService.pullModelStream(model.id, (percent, status) => {
          setInstallStatus(prev => ({ ...prev, [model.id]: { percent, status } }));
        });
      } catch (e) {
        message.warning(`Não foi possível baixar ${model.id}`);
      }
    }
    
    setProvisioning(false);
    onFinish({ spaces: selectedSpaces, models: suggestedModels });
  };

  const renderStep0 = () => (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Avatar size={80} icon={<ThunderboltOutlined />} style={{ backgroundColor: '#1890ff', marginBottom: 24 }} />
      <Title level={2}>Vela AI - Alpha</Title>
      <Paragraph style={{ fontSize: '1.1rem' }}>
        Antes de começarmos, precisamos do seu motor de inteligência local ligado.
      </Paragraph>

      {!ollamaReady ? (
        <Card bordered={false} style={{ background: '#fff1f0', borderRadius: 12, marginBottom: 24 }}>
          <Space direction="vertical">
            <Text strong type="danger">Ollama não detectado</Text>
            <Text type="secondary">
              O Vela depende do Ollama para rodar LLMs offline no seu Mac.
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button type="primary" href="https://ollama.com/download" target="_blank" icon={<GlobalOutlined />}>
                Baixar Ollama
              </Button>
            </div>
          </Space>
          <div style={{ marginTop: 24 }}>
            <Space>
              <LoadingOutlined />
              <Text type="secondary">Aguardando instalação...</Text>
            </Space>
          </div>
        </Card>
      ) : (
        <Alert
          message="Ollama Detectado!"
          description="Seu ambiente está pronto para o provisionamento inteligente."
          type="success"
          showIcon
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      )}

      <Button 
        type="primary" 
        size="large" 
        disabled={!ollamaReady} 
        onClick={handleStartAnalysis}
        style={{ height: 50, borderRadius: 10, minWidth: 200 }}
      >
        Iniciar Diagnóstico <RocketOutlined />
      </Button>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3}><DesktopOutlined /> Diagnóstico de Hardware</Title>
        {isAnalyzing && <Paragraph><LoadingOutlined /> O consultor Vela está analisando seu Mac...</Paragraph>}
      </div>

      {hardware && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card size="small" title="Memória RAM">
              <Text strong style={{ fontSize: 24 }}>{hardware.ram_gb} GB</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Processador">
              <Text strong>{hardware.cpu}</Text>
              {hardware.is_apple_silicon && <Tag color="blue" style={{ marginLeft: 8 }}>Apple Silicon</Tag>}
            </Card>
          </Col>
        </Row>
      )}

      <Title level={4}>Escolha seus Espaços</Title>
      <Paragraph type="secondary">Selecione quais áreas de foco você deseja configurar agora.</Paragraph>
      
      <Row gutter={[16, 16]}>
        {SPACES.map(space => (
          <Col span={12} key={space.id}>
            <Card 
              hoverable 
              onClick={() => {
                if (selectedSpaces.includes(space.id)) {
                  setSelectedSpaces(selectedSpaces.filter(s => s !== space.id));
                } else {
                  setSelectedSpaces([...selectedSpaces, space.id]);
                }
              }}
              style={{ 
                borderRadius: 12,
                border: selectedSpaces.includes(space.id) ? `2px solid ${space.color}` : '1px solid #f0f0f0',
                background: selectedSpaces.includes(space.id) ? `${space.color}08` : '#fff'
              }}
            >
              <Card.Meta 
                avatar={<Avatar style={{ backgroundColor: space.color }} icon={space.icon} />}
                title={space.name}
                description={space.desc}
              />
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <Checkbox checked={selectedSpaces.includes(space.id)} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <Button 
          type="primary" 
          size="large" 
          disabled={selectedSpaces.length === 0 || isAnalyzing}
          onClick={() => setCurrentStep(2)}
        >
          Escolher LLMs <ArrowRightOutlined />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <Title level={3}>Escolha de Modelos Inteligente</Title>
      <Paragraph type="secondary">Baseado no seu hardware, o consultor Vela sugere estas LLMs:</Paragraph>

      <List
        dataSource={suggestedModels.filter(m => selectedSpaces.includes(m.space))}
        renderItem={model => (
          <Card size="small" style={{ marginBottom: 12, borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tag color="purple">{model.space.toUpperCase()}</Tag>
                <div>
                   <Text strong>{model.name}</Text>
                   <br />
                   <Text type="secondary" style={{ fontSize: '0.8rem' }}>{model.id} - {model.reason}</Text>
                </div>
              </Space>
              {installStatus[model.id]?.percent === 100 ? (
                <Tag color="success" icon={<CheckOutlined />}>Concluído</Tag>
              ) : (
                <Text type="secondary">{installStatus[model.id]?.percent || 0}%</Text>
              )}
            </div>
            {provisioning && installStatus[model.id] && (
              <Progress percent={installStatus[model.id].percent} size="small" showInfo={false} />
            )}
          </Card>
        )}
      />

      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <Button size="large" onClick={() => setCurrentStep(1)} style={{ marginRight: 8 }} disabled={provisioning}>Voltar</Button>
        <Button 
          type="primary" 
          size="large" 
          loading={provisioning}
          onClick={async () => {
            await startProvisioning();
            setCurrentStep(3);
            handleCheckConnectors();
          }}
          style={{ borderRadius: 8 }}
        >
          Provisionar e Próximo
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <Title level={3}>Hub de Conectores Alpha</Title>
      <Paragraph type="secondary">Status dos seus sensores e integrações de produtividade.</Paragraph>
      
      <Row gutter={[12, 12]}>
        {[
          { id: 'slack', name: 'Slack', icon: <SlackOutlined /> },
          { id: 'gmail', name: 'Gmail', icon: <MailOutlined /> },
          { id: 'calendar', name: 'Agenda Unificada', icon: <CalendarOutlined /> },
          { id: 'datadog', name: 'Datadog (Mock)', icon: <LineChartOutlined /> },
          { id: 'granola', name: 'Granola (Mock)', icon: <ThunderboltOutlined /> },
          { id: 'ai_news', name: 'AI News Feed', icon: <GlobalOutlined /> },
          { id: 'chrome', name: 'Chrome Remote', icon: <ChromeOutlined /> }
        ].map(conn => (
          <Col span={8} key={conn.id}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Avatar size="small" icon={conn.icon} style={{ backgroundColor: '#f0f0f0', color: '#666' }} />
                  <Text strong>{conn.name}</Text>
                </Space>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color={
                    connectorStatus?.[conn.id]?.status === 'success' ? 'success' : 
                    connectorStatus?.[conn.id]?.status === 'warning' ? 'warning' : 'default'
                  }>
                    {connectorStatus?.[conn.id]?.msg || 'Verificando...'}
                  </Tag>
                  {isAnalyzing && <LoadingOutlined style={{ fontSize: 12 }} />}
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <Button size="large" onClick={() => setCurrentStep(2)} style={{ marginRight: 8 }}>Voltar</Button>
        <Button 
          type="primary" 
          size="large" 
          onClick={() => {
            auditTrail.log('Onboarding Finished', 'success');
            onFinish({ spaces: selectedSpaces, models: suggestedModels, connectors: connectorStatus });
          }}
          disabled={provisioning}
          style={{ borderRadius: 8, background: '#1890ff' }}
        >
          Finalizar Configuração
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      width={720}
      centered
      bodyStyle={{ padding: '32px 40px' }}
      style={{ borderRadius: 24, overflow: 'hidden' }}
    >
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 40 }}
        items={[
          { title: 'Motor', icon: <ThunderboltOutlined /> },
          { title: 'Espaços', icon: <AppstoreOutlined /> },
          { title: 'Cérebro', icon: <RocketOutlined /> },
          { title: 'Sensores', icon: <ApiOutlined /> }
        ]}
      />

      {currentStep === 0 && renderStep0()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </Modal>
  );
};

// Placeholder icons if needed
const AppstoreOutlined = () => <DesktopOutlined />;
