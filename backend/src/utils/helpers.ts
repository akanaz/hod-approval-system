// backend/src/utils/helpers.ts

import crypto from 'crypto';

/**
 * Generate a unique exit pass number
 */
export const generateExitPassNumber = (): string => {
  const prefix = 'EP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Calculate time difference in hours
 */
export const getHoursDifference = (start: Date, end: Date): number => {
  const diff = end.getTime() - start.getTime();
  return diff / (1000 * 60 * 60);
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate date is not in the past
 */
export const isDateInFuture = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Get urgency color code
 */
export const getUrgencyColor = (urgency: string): string => {
  const colors: { [key: string]: string } = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#dc2626'
  };
  return colors[urgency] || colors.MEDIUM;
};

/**
 * Get status color code
 */
export const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    PENDING: '#f59e0b',
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    MORE_INFO_NEEDED: '#3b82f6'
  };
  return colors[status] || colors.PENDING;
};
