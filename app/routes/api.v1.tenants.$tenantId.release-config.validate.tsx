/**
 * Release Configuration Validation API Route (BFF Layer)
 * Validate configuration before saving
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { validateConfiguration } from '~/utils/release-config-storage';
import type { ReleaseConfiguration } from '~/types/release-config';

/**
 * POST: Validate release configuration
 */
export async function action({ params, request }: ActionFunctionArgs) {
  const { tenantId } = params;
  
  if (!tenantId) {
    return json({ success: false, error: 'Tenant ID is required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const config: Partial<ReleaseConfiguration> = body.config;
    
    console.log(`[API] POST /api/v1/tenants/${tenantId}/release-config/validate`);
    
    // Validate configuration
    const validation = validateConfiguration(config);
    
    return json({
      success: true,
      isValid: validation.isValid,
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error('[API] Validation failed:', error);
    return json(
      { success: false, error: error.message || 'Validation failed' },
      { status: 500 }
    );
  }
}

