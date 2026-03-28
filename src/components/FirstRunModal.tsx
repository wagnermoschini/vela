import React, { useEffect, useState } from 'react';
import { Modal, Typography, Card, Space, Button, Progress, message } from 'antd';
import { 
  RocketOutlined, 
  CodeOutlined, 
  CheckCircleFilled, 
  LoadingOutlined
} from '@ant-design/icons';
import { ollamaService } from '../services/ollama';

const { Title, Text, Paragraph } = Typography;

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
  const [statusMap, setStatusMap] = useState<Record<string, ModelStatus>>({});
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStatusText, setCurrentStatusText] = useState('');
  const [, setIsInitializing] = useState(true);

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
    } finally {
      setIsInitializing(false);
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
      onClose();
      return;
    }

    for (const model of toInstall) {
      setInstallingModel(model.id);
      setStatusMap(prev => ({ ...prev, [model.id]: 'downloading' }));
      
      try {
        await ollamaService.pullModelStream(model.id, (percent, status) => {
          setCurrentProgress(percent);
          setCurrentStatusText(status);
        });
        
        setStatusMap(prev => ({ ...prev, [model.id]: 'completed' }));
      } catch (err) {
        message.error(`Falha ao baixar ${model.name}. Verifique o Ollama.`);
        setStatusMap(prev => ({ ...prev, [model.id]: 'pending' }));
        setInstallingModel(null);
        return; // Stop sequential download on error
      }
    }
    
    setInstallingModel(null);
    message.success('Ambiente configurado com sucesso!');
    setTimeout(onClose, 1000);
  };

  const allInstalled = RECOMMENDED_MODELS.every(m => 
    statusMap[m.id] === 'installed' || statusMap[m.id] === 'completed'
  );

  return (
    <Modal
      open={visible}
      closable={!installingModel}
      maskClosable={!installingModel}
      onCancel={onClose}
      footer={[
        <Button 
          key="action" 
          type="primary" 
          size="large" 
          loading={!!installingModel}
          onClick={allInstalled ? onClose : handleInstallSequentially}
          style={{ height: 45, paddingLeft: 40, paddingRight: 40, borderRadius: 8 }}
        >
          {allInstalled ? 'Começar agora!' : (installingModel ? 'Instalando... Aguarde' : 'Configurar e Instalar')}
        </Button>
      ]}
      width={650}
      title={null}
      centered
    >
      <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 20 }}>
        <Title level={2}>Configuração Inicial</Title>
        <Paragraph type="secondary" style={{ fontSize: '1.05rem' }}>
          O Vela precisa desses modelos para funcionar. Vamos prepará-los para você.
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {RECOMMENDED_MODELS.map((model) => {
          const status = statusMap[model.id];
          const isCurrent = installingModel === model.id;
          
          return (
            <Card 
              key={model.id}
              size="small" 
              bordered={false} 
              style={{ 
                background: isCurrent ? 'rgba(24, 144, 255, 0.05)' : 'rgba(0,0,0,0.02)', 
                borderRadius: 12,
                border: isCurrent ? '1px solid #91d5ff' : '1px solid transparent',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size="middle">
                  <div style={{ 
                    width: 40, height: 40, borderRadius: 8, 
                    background: '#fff', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: '#595959' 
                  }}>
                    {model.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '1rem' }}>{model.name}</Text>
                    <div style={{ fontSize: '0.85rem', color: '#8c8c8c' }}>{model.desc}</div>
                  </div>
                </Space>

                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  {status === 'installed' || status === 'completed' ? (
                    <Space style={{ color: '#52c41a' }}>
                      <CheckCircleFilled />
                      <Text style={{ color: '#52c41a' }}>Pronto</Text>
                    </Space>
                  ) : isCurrent ? (
                    <Space>
                      <LoadingOutlined />
                      <Text type="secondary">{currentProgress}%</Text>
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: '0.8rem' }}>Pendente</Text>
                  )}
                </div>
              </div>

              {isCurrent && (
                <div style={{ marginTop: 12 }}>
                  <Progress 
                    percent={currentProgress} 
                    size="small" 
                    status="active" 
                    showInfo={false}
                    strokeColor="#1890ff"
                  />
                  <div style={{ fontSize: '0.7rem', color: '#1890ff', marginTop: 4, textAlign: 'center' }}>
                    {currentStatusText}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </Space>

      {installingModel && (
         <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Text type="secondary" italic style={{ fontSize: '0.85rem' }}>
               <LoadingOutlined style={{ marginRight: 8 }} />
               O Vela está configurando seu ambiente. Por favor, não feche o app.
            </Text>
         </div>
      )}
    </Modal>
  );
};
