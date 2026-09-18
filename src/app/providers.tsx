'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { SupportRealtimeProvider } from '@/features/support-realtime';
import { StorefrontFxProvider } from '@/shared/fx/StorefrontFxProvider';
import './toaster.css';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <StorefrontFxProvider>
        <SupportRealtimeProvider>{children}</SupportRealtimeProvider>
      </StorefrontFxProvider>
      <Toaster
        theme="dark"
        position="bottom-right"
        expand
        gap={14}
        visibleToasts={6}
        offset={20}
        toastOptions={{
          unstyled: true,
          className: 'app-toast-slot',
        }}
      />
    </QueryClientProvider>
  );
}
