import React, { useState } from 'react';
import { Layout, Typography, Menu, Button, Space } from 'antd';
import { Sender, Bubble } from '@ant-design/x';
import { FolderOpenOutlined, MessageOutlined, CodeOutlined } from '@ant-design/icons';
import { Sandpack } from '@codesandbox/sandpack-react';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export const MainLayout: React.FC = () => {
  const [sandpackVisible, setSandpackVisible] = useState(false);
  const [messages, setMessages] = useState([
    {
      key: '1',
      content: 'Hello, how can I help you today?',
      role: 'ai',
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        key: Date.now().toString(),
        content: inputValue,
        role: 'user',
      }
    ]);
    setInputValue('');
  };

  return (
    <Layout style={{ height: '100%', width: '100%', background: 'var(--bg-color)' }}>
      {/* Sidebar - Projects & History */}
      <Sider 
        width={250} 
        theme="light" 
        style={{ 
          borderRight: '1px solid var(--border-color)', 
          background: 'var(--bg-color)' 
        }}
      >
        <div style={{ padding: 'var(--spacing-base)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Space align="center" style={{ marginBottom: 'var(--spacing-base)' }}>
            <FolderOpenOutlined style={{ fontSize: '1.2rem' }} />
            <Title level={5} style={{ margin: 0 }}>Projects</Title>
          </Space>
          <Menu 
            mode="inline" 
            style={{ 
              background: 'transparent',
              border: 'none',
              flex: 1
            }}
            items={[
              { key: '1', icon: <MessageOutlined />, label: 'Recent Chat 1' },
              { key: '2', icon: <MessageOutlined />, label: 'Setup Script' },
            ]}
          />
        </div>
      </Sider>

      {/* Main Chat Area */}
      <Content style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
        <div style={{ padding: 'var(--spacing-base)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Vela Workspace</Title>
          <Button 
            icon={<CodeOutlined />} 
            onClick={() => setSandpackVisible(!sandpackVisible)}
            type={sandpackVisible ? 'primary' : 'default'}
          >
            {sandpackVisible ? 'Hide Artifacts' : 'Show Artifacts'}
          </Button>
        </div>
        
        <div style={{ flex: 1, padding: 'var(--spacing-base)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.map(msg => (
            <Bubble 
              key={msg.key} 
              content={msg.content} 
              placement={msg.role === 'user' ? 'end' : 'start'}
              style={{
                marginBottom: '1rem',
                opacity: 0.95,
                maxWidth: '80%'
              }}
            />
          ))}
        </div>

        <div style={{ padding: 'var(--spacing-base)', borderTop: '1px solid var(--border-color)' }}>
          <Sender 
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSend}
            placeholder="Type your message..."
            style={{
               boxShadow: 'var(--box-shadow-flat)'
            }}
          />
        </div>
      </Content>

      {/* Artifacts (Sandpack) Area */}
      {sandpackVisible && (
        <Sider 
          width={450}
          theme="light"
          style={{ 
            borderLeft: '1px solid var(--border-color)', 
            background: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: 'var(--spacing-base)', height: '100%' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Live Code Preview</Text>
            <div style={{ height: 'calc(100% - 30px)' }}>
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
