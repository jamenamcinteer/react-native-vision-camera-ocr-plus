import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
};

export default AppProvider;
