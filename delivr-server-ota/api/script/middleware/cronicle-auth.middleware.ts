/**
 * Cronicle Webhook Authentication Middleware
 * 
 * Validates the X-Cronicle-Secret header against the configured secret.
 * Used for internal endpoints that Cronicle calls.
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// CONSTANTS
// ============================================================================

const CRONICLE_SECRET_HEADER = 'x-cronicle-secret';

const CRONICLE_AUTH_ERROR_MESSAGES = {
  MISSING_SECRET: 'Missing X-Cronicle-Secret header',
  INVALID_SECRET: 'Invalid X-Cronicle-Secret',
  SECRET_NOT_CONFIGURED: 'Cronicle webhook secret not configured'
} as const;

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to authenticate Cronicle webhook requests
 * 
 * Validates the X-Cronicle-Secret header against CRONICLE_WEBHOOK_SECRET env var.
 * Returns 401 if authentication fails.
 * 
 * @example
 * router.post('/webhook', cronicleAuthMiddleware, handler);
 */
export const cronicleAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expectedSecret = process.env.CRONICLE_WEBHOOK_SECRET;
  
  // Check if secret is configured
  const secretNotConfigured = !expectedSecret;
  if (secretNotConfigured) {
    console.error('[cronicleAuthMiddleware] CRONICLE_WEBHOOK_SECRET not configured');
    res.status(500).json({
      success: false,
      error: CRONICLE_AUTH_ERROR_MESSAGES.SECRET_NOT_CONFIGURED
    });
    return;
  }

  // Get the secret from request header
  const providedSecret = req.headers[CRONICLE_SECRET_HEADER];
  
  // Check if header is present
  const headerMissing = !providedSecret;
  if (headerMissing) {
    console.warn('[cronicleAuthMiddleware] Missing X-Cronicle-Secret header');
    res.status(401).json({
      success: false,
      error: CRONICLE_AUTH_ERROR_MESSAGES.MISSING_SECRET
    });
    return;
  }

  // Validate the secret
  const secretInvalid = providedSecret !== expectedSecret;
  if (secretInvalid) {
    console.warn('[cronicleAuthMiddleware] Invalid X-Cronicle-Secret');
    res.status(401).json({
      success: false,
      error: CRONICLE_AUTH_ERROR_MESSAGES.INVALID_SECRET
    });
    return;
  }

  // Authentication successful
  next();
};

