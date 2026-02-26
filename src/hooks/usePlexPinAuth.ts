import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { pollPlexPinClient, getPlexClientId } from '@/lib/plex/client-auth';
import { apiClient } from '@/lib/api-client';

/**
 * Hook to poll Plex PIN status directly from Plex API
 * 
 * @param pinId - The PIN ID to poll (null if not started)
 * @param onAuthorized - Callback when authorization is successful
 */
export function usePlexPinAuth(
  pinId: number | null,
  onAuthorized?: (data: any) => void
) {
  useEffect(() => {
    if (pinId === null) return;

    let isMounted = true;
    let pollTimeout: NodeJS.Timeout;

    const poll = async () => {
      if (!isMounted) return;

      try {
        const pinData = await pollPlexPinClient(pinId);
        
        if (pinData && pinData.authToken) {
          // PIN authorized! Now finalize with our server
          const clientId = getPlexClientId();
          
          try {
            const res = await apiClient.post('/api/auth/plex', {
              authToken: pinData.authToken,
              clientId: clientId,
              user: pinData.user
            });
            
            if (res.data.success) {
              onAuthorized?.(res.data);
              return true;
            }
          } catch (serverErr) {
            logger.error('[usePlexPinAuth] Server finalization error:', serverErr);
          }
        }
      } catch (err: any) {
        logger.error('[usePlexPinAuth] Plex polling error:', err);
      }
      
      // If we didn't return true (success), schedule the next poll
      if (isMounted) {
        pollTimeout = setTimeout(poll, 3000);
      }
      return false;
    };

    // Start polling
    poll();

    return () => {
      isMounted = false;
      clearTimeout(pollTimeout);
    };
  }, [pinId, onAuthorized]);
}
