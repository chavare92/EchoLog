import { QueryClient, MutationCache, QueryCache } from "@tanstack/react-query";

/**
 * Log unexpected query / mutation errors to the console so developers can
 * inspect them via devtools. Friendly messages are produced in individual
 * catch blocks using src/lib/errors.ts.
 */
function onGlobalError(error: unknown, context: string) {
  console.error(`[EchoLog][${context}]`, error);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => onGlobalError(error, "QueryCache"),
  }),
  mutationCache: new MutationCache({
    onError: (error) => onGlobalError(error, "MutationCache"),
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
