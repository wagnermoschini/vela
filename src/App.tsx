import { useEffect, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { MainLayout } from './MainLayout';
import { FirstRunModal } from './components/FirstRunModal';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    // Check first run from localStorage
    const hasBeenRun = localStorage.getItem('vela_first_run_complete');
    if (!hasBeenRun) {
      setIsFirstRun(true);
    }

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleCloseFirstRun = () => {
    localStorage.setItem('vela_first_run_complete', 'true');
    setIsFirstRun(false);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          // Flatten standard components without deep glows, conforming to minimal design
          colorPrimary: isDarkMode ? '#ffffff' : '#1a1a1a',
          colorBgBase: isDarkMode ? '#1e1e1e' : '#f7f7f8',
          colorTextBase: isDarkMode ? '#e3e3e3' : '#1a1a1a',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', // Minimal flat shadow everywhere
        },
        components: {
          Layout: {
            bodyBg: 'transparent',
            headerBg: 'transparent',
            siderBg: 'transparent',
          },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent'
          }
        }
      }}
    >
      <MainLayout />
      <FirstRunModal 
        visible={isFirstRun} 
        onClose={handleCloseFirstRun} 
      />
    </ConfigProvider>
  );
}

export default App;
