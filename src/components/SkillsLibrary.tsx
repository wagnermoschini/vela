import React, { useEffect, useState } from 'react';
import { Card, Typography, List, Tag, Button, Avatar, Spin, Empty } from 'antd';
import { 
  SearchOutlined, 
  FileTextOutlined, 
  DatabaseOutlined,
  CloudOutlined 
} from '@ant-design/icons';
import { mcpService, McpTool } from '../services/mcpService';

const { Title, Text } = Typography;

export const SkillsLibrary: React.FC = () => {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const toolList = await mcpService.listTools();
      setTools(toolList);
    } catch (error) {
      console.error('Failed to fetch tools', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const getToolIcon = (name: string) => {
    if (name.includes('search')) return <SearchOutlined />;
    if (name.includes('file')) return <FileTextOutlined />;
    if (name.includes('memory')) return <DatabaseOutlined />;
    return <CloudOutlined />;
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Skills & Conectores MCP</Title>
          <Text type="secondary">Ferramentas detectadas no seu sidecar Python.</Text>
        </div>
        <Button onClick={fetchTools} disabled={loading}>Atualizar</Button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <Spin size="large" tip="Buscando ferramentas no sidecar..." />
        </div>
      ) : tools.length === 0 ? (
        <Empty 
          style={{ marginTop: 60 }} 
          description="Nenhuma ferramenta detectada no sidecar MCP." 
        />
      ) : (
        <List
          grid={{ gutter: 16, column: 1 }}
          style={{ marginTop: 24 }}
          dataSource={tools}
          renderItem={(item) => (
            <List.Item>
              <Card hoverable styles={{ body: { padding: '16px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar 
                      size={48} 
                      icon={getToolIcon(item.name)} 
                      style={{ background: '#e6f7ff', color: '#1890ff' }} 
                    />
                    <div>
                      <Text strong style={{ fontSize: '1.1rem', display: 'block' }}>{item.name}</Text>
                      <Text type="secondary" style={{ fontSize: '0.85rem' }}>{item.description}</Text>
                      <div style={{ marginTop: 8 }}>
                        {item.parameters?.required?.map((req: string) => (
                          <Tag key={req} color="orange" style={{ fontSize: '0.7rem' }}>REQ: {req}</Tag>
                        ))}
                        <Tag color="blue" style={{ fontSize: '0.7rem' }}>MCP-READY</Tag>
                      </div>
                    </div>
                  </div>
                  <Button type="default">Configurar</Button>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};
