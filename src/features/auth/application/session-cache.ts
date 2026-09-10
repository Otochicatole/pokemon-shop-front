import type { QueryClient } from '@tanstack/react-query';

export function clearUserSupportCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['support'] });
  queryClient.removeQueries({ queryKey: ['support-realtime', 'user'] });
}

export function clearUserPrivateCache(queryClient: QueryClient) {
  clearUserSupportCache(queryClient);
  queryClient.removeQueries({ queryKey: ['loyalty-account'] });
  queryClient.removeQueries({ queryKey: ['orders'] });
  queryClient.removeQueries({ queryKey: ['order'] });
}

export function clearUserSessionCache(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: ['me'], exact: true });
  queryClient.removeQueries({ queryKey: ['me'] });
  clearUserPrivateCache(queryClient);
}

export function markUserSessionEnded(queryClient: QueryClient) {
  void queryClient.cancelQueries({ queryKey: ['me'], exact: true });
  clearUserPrivateCache(queryClient);
  queryClient.setQueryData(['me'], null);
}

export async function refreshUserSessionFromCookie(queryClient: QueryClient) {
  const cancellation = queryClient.cancelQueries({ queryKey: ['me'], exact: true });
  clearUserPrivateCache(queryClient);
  queryClient.setQueryData(['me'], null);
  await cancellation;
  await queryClient.invalidateQueries({ queryKey: ['me'], exact: true, refetchType: 'active' });
}
