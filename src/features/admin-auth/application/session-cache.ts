import type { QueryClient } from '@tanstack/react-query';

export function clearAdminPrivateCache(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] === 'admin'
      && !(query.queryKey.length === 2 && query.queryKey[1] === 'session'),
  });
  queryClient.removeQueries({ queryKey: ['support-realtime', 'admin'] });
}

export function clearAdminSessionCache(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: ['admin'] });
  clearAdminPrivateCache(queryClient);
  queryClient.removeQueries({ queryKey: ['admin', 'session'], exact: true });
}

export function markAdminSessionEnded(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: ['admin'] });
  clearAdminPrivateCache(queryClient);
  queryClient.setQueryData(['admin', 'session'], null);
}

export async function refreshAdminSessionFromCookie(queryClient: QueryClient) {
  const cancellation = queryClient.cancelQueries({ queryKey: ['admin'] });
  clearAdminPrivateCache(queryClient);
  queryClient.setQueryData(['admin', 'session'], null);
  await cancellation;
  await queryClient.invalidateQueries({ queryKey: ['admin', 'session'], exact: true, refetchType: 'active' });
}
