/**
 * Toast Notification Utility
 * Wrapper around Mantine Notifications for consistent toast messages
 * across the application
 */

import React from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
}

/**
 * Show a success toast notification
 */
export function showSuccessToast(options: ToastOptions) {
  notifications.show({
    title: options.title || 'Success',
    message: options.message,
    color: 'green',
    icon: React.createElement(IconCheck, { size: 20, strokeWidth: 2.5 }),
    autoClose: options.duration || 4000,
    position: options.position || 'top-right',
    withBorder: true,
    style: {
      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
    },
    styles: {
      root: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
        padding: '16px',
      },
      title: {
        color: '#14532d',
        fontWeight: 600,
        fontSize: '14px',
      },
      description: {
        color: '#166534',
        fontSize: '13px',
        marginTop: '4px',
      },
      icon: {
        backgroundColor: '#dcfce7',
        color: '#16a34a',
      },
      closeButton: {
        color: '#14532d',
        '&:hover': {
          backgroundColor: '#dcfce7',
        },
      },
    },
  });
}

/**
 * Show an error toast notification
 */
export function showErrorToast(options: ToastOptions) {
  notifications.show({
    title: options.title || 'Error',
    message: options.message,
    color: 'red',
    icon: React.createElement(IconAlertTriangle, { size: 20, strokeWidth: 2.5 }),
    autoClose: options.duration || 6000,
    position: options.position || 'top-right',
    withBorder: true,
    style: {
      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)',
    },
    styles: {
      root: {
        backgroundColor: '#fef2f2',
        borderColor: '#fca5a5',
        padding: '16px',
      },
      title: {
        color: '#991b1b',
        fontWeight: 600,
        fontSize: '14px',
      },
      description: {
        color: '#7f1d1d',
        fontSize: '13px',
        marginTop: '4px',
      },
      icon: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
      },
      closeButton: {
        color: '#991b1b',
        '&:hover': {
          backgroundColor: '#fee2e2',
        },
      },
    },
  });
}

/**
 * Show an info toast notification
 */
export function showInfoToast(options: ToastOptions) {
  notifications.show({
    title: options.title || 'Info',
    message: options.message,
    color: 'blue',
    icon: React.createElement(IconInfoCircle, { size: 20, strokeWidth: 2.5 }),
    autoClose: options.duration || 4000,
    position: options.position || 'top-right',
    withBorder: true,
    style: {
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
    },
    styles: {
      root: {
        backgroundColor: '#eff6ff',
        borderColor: '#93c5fd',
        padding: '16px',
      },
      title: {
        color: '#1e3a8a',
        fontWeight: 600,
        fontSize: '14px',
      },
      description: {
        color: '#1e40af',
        fontSize: '13px',
        marginTop: '4px',
      },
      icon: {
        backgroundColor: '#dbeafe',
        color: '#2563eb',
      },
      closeButton: {
        color: '#1e3a8a',
        '&:hover': {
          backgroundColor: '#dbeafe',
        },
      },
    },
  });
}

/**
 * Show a warning toast notification
 */
export function showWarningToast(options: ToastOptions) {
  notifications.show({
    title: options.title || 'Warning',
    message: options.message,
    color: 'yellow',
    icon: React.createElement(IconAlertTriangle, { size: 20, strokeWidth: 2.5 }),
    autoClose: options.duration || 5000,
    position: options.position || 'top-right',
    withBorder: true,
    style: {
      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)',
    },
    styles: {
      root: {
        backgroundColor: '#fefce8',
        borderColor: '#fde047',
        padding: '16px',
      },
      title: {
        color: '#713f12',
        fontWeight: 600,
        fontSize: '14px',
      },
      description: {
        color: '#854d0e',
        fontSize: '13px',
        marginTop: '4px',
      },
      icon: {
        backgroundColor: '#fef9c3',
        color: '#ca8a04',
      },
      closeButton: {
        color: '#713f12',
        '&:hover': {
          backgroundColor: '#fef9c3',
        },
      },
    },
  });
}

/**
 * Convenience function to show API error toast
 * Extracts message from error object automatically
 */
export function showApiErrorToast(error: unknown, fallbackMessage = 'An error occurred') {
  let message = fallbackMessage;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  showErrorToast({ message });
}

/**
 * Show a loading toast notification that can be updated later
 * Returns the notification ID for updating
 */
export function showLoadingToast(options: ToastOptions): string {
  const id = `loading-${Date.now()}`;
  notifications.show({
    id,
    title: options.title || 'Loading',
    message: options.message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
    position: options.position || 'bottom-right',
  });
  return id;
}

/**
 * Update a loading toast to success
 */
export function updateToastToSuccess(id: string, options: ToastOptions) {
  notifications.update({
    id,
    title: options.title || 'Success',
    message: options.message,
    color: 'green',
    icon: React.createElement(IconCheck, { size: 18 }),
    loading: false,
    autoClose: options.duration || 4000,
  });
}

/**
 * Update a loading toast to error
 */
export function updateToastToError(id: string, options: ToastOptions) {
  notifications.update({
    id,
    title: options.title || 'Error',
    message: options.message,
    color: 'red',
    icon: React.createElement(IconX, { size: 18 }),
    loading: false,
    autoClose: options.duration || 6000,
  });
}

/**
 * Clear all toast notifications
 */
export function clearAllToasts() {
  notifications.clean();
}

/**
 * Hide a specific toast notification
 */
export function hideToast(id: string) {
  notifications.hide(id);
}

