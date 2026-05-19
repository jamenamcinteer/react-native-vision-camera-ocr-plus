import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';

const AppProvider = () => {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
};

export default AppProvider;
