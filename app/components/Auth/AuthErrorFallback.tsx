import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRefresh, IconLogout } from '@tabler/icons-react';
import { useNavigate } from '@remix-run/react';
import { useState } from 'react';

interface AuthErrorFallbackProps {
  message: string;
}

export function AuthErrorFallback({ message }: AuthErrorFallbackProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    // Clear all cookies client-side (including analytics)
    const clearAllCookies = () => {
      const hostname = window.location.hostname;
      const domain = hostname.includes('.') ? `.${hostname.split('.').slice(-2).join('.')}` : hostname;
      
      // Get all cookies
      const cookies = document.cookie.split(";");
      
      // Clear each cookie with multiple path/domain combinations
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (!name) return;
        
        // Clear cookie with various combinations
        const paths = ['/', ''];
        const domains = [hostname, domain, `.${hostname}`, ''];
        
        paths.forEach(path => {
          domains.forEach(dom => {
            const domainPart = dom ? `;domain=${dom}` : '';
            const pathPart = path ? `;path=${path}` : '';
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT${pathPart}${domainPart}`;
          });
        });
      });
      
      // Clear common analytics/tracking cookies explicitly
      // These might be set with different domains/paths
      const analyticsCookies = [
        '_ga', '_gid', '_gat', '_fbp', '_fbc', 
        'mixpanel', 'segment', '_session', 'oauth.session'
      ];
      
      // Also clear cookies that start with common prefixes
      const cookiePrefixes = ['_ga_', 'amplitude_', 'mp_', 's_'];
      
      // Get all cookie names to find prefixed ones
      const allCookieNames = document.cookie.split(";").map(c => {
        const eqPos = c.indexOf("=");
        return eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      }).filter(Boolean);
      
      // Clear prefixed cookies
      allCookieNames.forEach(cookieName => {
        cookiePrefixes.forEach(prefix => {
          if (cookieName.startsWith(prefix)) {
            const paths = ['/', ''];
            const domains = [hostname, domain, `.${hostname}`, ''];
            paths.forEach(path => {
              domains.forEach(dom => {
                const domainPart = dom ? `;domain=${dom}` : '';
                const pathPart = path ? `;path=${path}` : '';
                document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT${pathPart}${domainPart}`;
              });
            });
          }
        });
      });
      
      // Clear known analytics cookies
      analyticsCookies.forEach(cookieName => {
        const paths = ['/', ''];
        const domains = [hostname, domain, `.${hostname}`, ''];
        paths.forEach(path => {
          domains.forEach(dom => {
            const domainPart = dom ? `;domain=${dom}` : '';
            const pathPart = path ? `;path=${path}` : '';
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT${pathPart}${domainPart}`;
          });
        });
      });
    };
    
    // Clear cookies immediately
    clearAllCookies();
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Call logout API to clear server-side session
    try {
      await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (error) {
      // Even if API call fails, cookies are already cleared, proceed with redirect
      console.warn('Logout API call failed, but cookies cleared. Redirecting to login:', error);
    }
    
    // Force redirect to login (using window.location.href ensures full page reload)
    window.location.href = '/login';
  };

  const handleRetry = () => {
    setIsRetrying(true);
    // Reload the page to retry
    window.location.reload();
  };

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Authentication Failed"
      color="red"
      variant="light"
    >
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleRetry}
            variant="light"
            loading={isRetrying}
            disabled={isLoggingOut || isRetrying}
            style={{
              border: '1px solid',
              borderColor: 'var(--mantine-color-gray-4)',
              transition: 'all 0.2s ease',
            }}
            styles={{
              root: {
                '&:hover': {
                  borderColor: 'var(--mantine-color-blue-6)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            Retry
          </Button>
          <Button
            leftSection={<IconLogout size={16} />}
            onClick={handleLogout}
            color="red"
            variant="light"
            loading={isLoggingOut}
            disabled={isLoggingOut || isRetrying}
            style={{
              border: '1px solid',
              borderColor: 'var(--mantine-color-red-4)',
              transition: 'all 0.2s ease',
            }}
            styles={{
              root: {
                '&:hover': {
                  borderColor: 'var(--mantine-color-red-7)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            Logout
          </Button>
        </div>
      </Stack>
    </Alert>
  );
}

