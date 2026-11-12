// The fonts and tokens come before any component's styles.
import '@fontsource/jost/latin-600.css';
import '@fontsource/jost/latin-700.css';
import '@/ui/tokens.css';
import '@/ui/global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/ui/Toast/Toast';
import { TooltipProvider } from '@/ui/Tooltip/Tooltip';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    // A failed request shows Try again at once, instead of retrying out of sight.
    queries: { retry: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
