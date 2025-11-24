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
    icon: React.createElement(IconCheck, { size: 18 }),
    autoClose: options.duration || 4000,
    position: options.position || 'top-right',
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
    icon: React.createElement(IconX, { size: 18 }),
    autoClose: options.duration || 6000,
    position: options.position || 'top-right',
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
    icon: React.createElement(IconInfoCircle, { size: 18 }),
    autoClose: options.duration || 4000,
    position: options.position || 'top-right',
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
    icon: React.createElement(IconAlertTriangle, { size: 18 }),
    autoClose: options.duration || 5000,
    position: options.position || 'top-right',
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
    position: options.position || 'top-right',
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

