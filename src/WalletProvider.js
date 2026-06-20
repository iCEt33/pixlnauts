'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';        // ← added mainnet
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, fallback } from 'wagmi';

const config = getDefaultConfig({
  appName: 'PIXLNAUTS',
  projectId: process.env.REACT_APP_WALLET_CONNECT_ID || 'ae42ea8a436575f7d8709612cd256dc6',
  chains: [polygon, mainnet],                            // ← added mainnet
  transports: {
    [polygon.id]: fallback([
      http('https://tenderly.rpc.polygon.community'),
      http('https://polygon.drpc.org'),
    ]),
    [mainnet.id]: http(),                                // ← added (required transport)
  },
});

const queryClient = new QueryClient();

const pixlnautsTheme = darkTheme({
  accentColor: '#0f0',
  accentColorForeground: 'black',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function WalletProvider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={pixlnautsTheme} initialChain={polygon}>   {/* ← added initialChain */}
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}