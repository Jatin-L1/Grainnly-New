import './globals.css';
import { MetaMaskProvider } from '@/components/MetaMaskProvider';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'Grainlyyy',
  description: 'Blockchain-based Public Distribution System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MetaMaskProvider>
          {children}
        </MetaMaskProvider>
        <Toaster />
      </body>
    </html>
  );
}