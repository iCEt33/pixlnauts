'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, fallback } from 'wagmi';

// Create wagmi config with new v2 API
const config = getDefaultConfig({
  appName: 'PIXLNAUTS',
  projectId: process.env.REACT_APP_WALLET_CONNECT_ID || 'placeholder',
  chains: [polygon],
  transports: {
    [polygon.id]: fallback([
      http('https://tenderly.rpc.polygon.community'),
      http('https://polygon.drpc.org'),
    ]),
  },
});

// Create a client for React Query
const queryClient = new QueryClient();

// Custom PIXLNAUTS theme
const pixlnautsTheme = darkTheme({
  accentColor: '#0f0', // Matrix green
  accentColorForeground: 'black',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function WalletProvider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={pixlnautsTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}