import React, { useEffect, useState } from 'react';
import { Modal, Typography, Card, Space, Button, Progress, message, Steps, Input, Alert, Tag } from 'antd';
import { 
  RocketOutlined, 
  CodeOutlined, 
  GlobalOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { ollamaService } from '../services/ollama';

const { Title, Text, Paragraph, Link } = Typography;

interface FirstRunModalProps {
  visible: boolean;
  onClose: () => void;
}

type ModelStatus = 'pending' | 'downloading' | 'completed' | 'installed';

const RECOMMENDED_MODELS = [
  { id: 'llama3.1:8b', name: 'Vela Co-work', icon: <RocketOutlined />, desc: 'Llama 3.1 8B - Generalista' },
  { id: 'qwen2.5-coder:7b', name: 'Vela Code', icon: <CodeOutlined />, desc: 'Qwen 2.5 Coder 7B - Especialista' }
];

export const FirstRunModal: React.FC<FirstRunModalProps> = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<string, ModelStatus>>({});
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [tavilyKey, setTavilyKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  const checkLocalModels = async () => {
    try {
      const models = await ollamaService.listLocalModels();
      const newStatus: Record<string, ModelStatus> = {};
      
      const installedNames = models.map((m: any) => m.name);
      
      RECOMMENDED_MODELS.forEach(m => {
        if (installedNames.includes(m.id)) {
          newStatus[m.id] = 'installed';
        } else {
          newStatus[m.id] = 'pending';
        }
      });
      
      setStatusMap(newStatus);
    } catch (e) {
      console.error('Failed to check models', e);
    }
  };

  useEffect(() => {
    if (visible) {
      checkLocalModels();
    }
  }, [visible]);

  const handleInstallSequentially = async () => {
    const toInstall = RECOMMENDED_MODELS.filter(m => statusMap[m.id] === 'pending');
    
    if (toInstall.length === 0) {
      setCurrentStep(1);
      return;
    }

    for (const model of toInstall) {
      setInstallingModel(model.id);
      setStatusMap(prev => ({ ...prev, [model.id]: 'downloading' }));
      
      try {
        await ollamaService.pullModelStream(model.id, (percent) => {
          setCurrentProgress(percent);
        });
        
        setStatusMap(prev => ({ ...prev, [model.id]: 'completed' }));
      } catch (err) {
        message.error(`Falha ao baixar ${model.name}. Verifique o Ollama.`);
        setStatusMap(prev => ({ ...prev, [model.id]: 'pending' }));
        setInstallingModel(null);
        return; 
      }
    }
    
    setInstallingModel(null);
    message.success('Modelos preparados!');
    setCurrentStep(1);
  };

  const handleSaveTavilyKey = async () => {
    if (!tavilyKey.trim()) {
       message.warning('Por favor, insira uma chave ou pule esta etapa.');
       return;
    }

    setIsSavingKey(true);
    try {
      await invoke('save_env_key', { key: 'TAVILY_API_KEY', value: tavilyKey.trim() });
      message.success('Chave de API salva com sucesso!');
      onClose();
    } catch (err) {
      message.error('Erro ao salvar no arquivo .env');
    } finally {
      setIsSavingKey(false);
    }
  };

  const allModelsReady = RECOMMENDED_MODELS.every(m => 
    statusMap[m.id] === 'installed' || statusMap[m.id] === 'completed'
  );

  const renderStep0 = () => (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Modelos de Inteligência Local</Title>
        <Paragraph type="secondary">
          O Vela utiliza o Ollama para rodar modelos direto no seu hardware.
        </Paragraph>
      </div>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {RECOMMENDED_MODELS.map((model) => {
          const status = statusMap[model.id];
          const isCurrent = installingModel === model.id;
          
          return (
            <Card 
              key={model.id}
              size="small" 
              style={{ 
                borderRadius: 12,
                border: isCurrent ? '1px solid #1890ff' : '1px solid #f0f0f0',
                background: isCurrent ? '#f0f7ff' : '#fafafa'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <div style={{ fontSize: 20 }}>{model.icon}</div>
                  <div>
                    <Text strong>{model.name}</Text>
                    <div style={{ fontSize: '0.8rem', color: '#8c8c8c' }}>{model.desc}</div>
                  </div>
                </Space>

                <div>
                  {status === 'installed' || status === 'completed' ? (
                    <Tag color="success" icon={<CheckOutlined />}>Pronto</Tag>
                  ) : isCurrent ? (
                    <Text type="secondary">{currentProgress}%</Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: '0.8rem' }}>Pendente</Text>
                  )}
                </div>
              </div>
              {isCurrent && (
                <Progress percent={currentProgress} size="small" showInfo={false} style={{ marginTop: 8 }} />
              )}
            </Card>
          );
        })}
      </Space>

      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <Button 
          type="primary" 
          size="large" 
          icon={allModelsReady ? <ArrowRightOutlined /> : null}
          loading={!!installingModel}
          onClick={allModelsReady ? () => setCurrentStep(1) : handleInstallSequentially}
          style={{ borderRadius: 8, height: 45, minWidth: 180 }}
        >
          {allModelsReady ? 'Próximo Passo' : 'Baixar Modelos'}
        </Button>
      </div>
    </>
  );

  const renderStep1 = () => (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Acesso à Internet (Opcional)</Title>
        <Paragraph type="secondary">
          Configure o Tavily AI para permitir que o Vela realize buscas na web em tempo real.
        </Paragraph>
      </div>

      <Card bordered={false} style={{ background: '#f9f9f9', borderRadius: 12, marginBottom: 20 }}>
        <Title level={5}><SafetyCertificateOutlined /> Como obter sua chave:</Title>
        <ol style={{ paddingLeft: 20, color: '#595959' }}>
          <li>Acesse <Link href="https://tavily.com" target="_blank">tavily.com</Link> e crie uma conta gratuita.</li>
          <li>Vá ao seu Dashboard e copie a <b>API Key</b>.</li>
          <li>Cole a chave no campo abaixo.</li>
        </ol>
        <Alert 
          message="Privacidade Prioritária" 
          description="Sua chave será salva apenas localmente no arquivo .env do seu computador."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      <div style={{ marginBottom: 32 }}>
        <Text strong>Tavily API Key</Text>
        <Input.Password 
          placeholder="tvly-xxxxxxxxxxxxxxxxxxxx" 
          size="large"
          value={tavilyKey}
          onChange={e => setTavilyKey(e.target.value)}
          style={{ marginTop: 8, borderRadius: 8 }}
          prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <Button size="large" onClick={() => setCurrentStep(0)} disabled={isSavingKey}>Voltar</Button>
        <Space>
           <Button size="large" type="text" onClick={onClose} disabled={isSavingKey}>Pular por enquanto</Button>
           <Button 
             type="primary" 
             size="large" 
             onClick={handleSaveTavilyKey} 
             loading={isSavingKey}
             style={{ borderRadius: 8, height: 45, minWidth: 150 }}
           >
             Finalizar Setup
           </Button>
        </Space>
      </div>
    </>
  );

  return (
    <Modal
      open={visible}
      closable={!installingModel && !isSavingKey}
      maskClosable={false}
      footer={null}
      width={650}
      title={null}
      centered
      bodyStyle={{ padding: '32px 40px' }}
    >
      <Steps 
        current={currentStep} 
        size="small" 
        style={{ marginBottom: 40 }}
        items={[
          { title: 'IA Local', icon: <ThunderboltOutlined /> },
          { title: 'Conectividade', icon: <GlobalOutlined /> }
        ]}
      />

      {currentStep === 0 ? renderStep0() : renderStep1()}
    </Modal>
  );
};
