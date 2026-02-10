import { QueryClient } from '@tanstack/react-query';

// Configure React Query with optimized defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10000, // Data is fresh for 10s
            gcTime: 5 * 60 * 1000, // Cache for 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
        },
    },
});
