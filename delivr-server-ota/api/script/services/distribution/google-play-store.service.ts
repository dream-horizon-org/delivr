import fetch from 'node-fetch';
import { getStorage } from '../../storage/storage-instance';
import { StoreCredentialController, StoreIntegrationController } from '../../storage/integrations/store/store-controller';
import { decryptFromStorage } from '../../utils/encryption';
import { PLAY_STORE_UPLOAD_CONSTANTS } from '../../constants/store';
import { MockGooglePlayStoreService } from './google-play-store.mock';

const { GoogleAuth } = require('google-auth-library');

/**
 * Helper function to get StoreCredentialController from storage
 */
const getCredentialController = (): StoreCredentialController => {
  const storage = getStorage();
  const controller = (storage as any).storeCredentialController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreCredentialController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

/**
 * Helper function to get StoreIntegrationController from storage
 */
const getStoreIntegrationController = (): StoreIntegrationController => {
  const storage = getStorage();
  const controller = (storage as any).storeIntegrationController;
  const controllerMissing = !controller;
  if (controllerMissing) {
    throw new Error('StoreIntegrationController not initialized. Storage setup may not have completed.');
  }
  return controller;
};

/**
 * Helper function to decrypt credentials from backend storage
 */
const decryptCredentialsFromStorage = (encryptedBuffer: Buffer): string => {
  const encryptedString = encryptedBuffer.toString('utf-8');
  return decryptFromStorage(encryptedString);
};

/**
 * Google Play Store Service
 * 
 * Provides methods to interact with Google Play Console API
 * for managing app submissions, track updates, and releases
 */
export class GooglePlayStoreService {
  private readonly baseUrl = PLAY_STORE_UPLOAD_CONSTANTS.API_BASE_URL;
  private readonly accessToken: string;
  private readonly packageName: string;
  private readonly PRODUCTION_TRACK = 'production';

  constructor(
    accessToken: string,
    packageName: string
  ) {
    this.accessToken = accessToken;
    this.packageName = packageName;
  }

  /**
   * Make authenticated request to Google Play API
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google Play API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new edit session
   * POST /applications/{packageName}/edits
   * 
   * @returns Promise with edit data containing id and expiryTimeSeconds
   */
  async createEdit(): Promise<{ id: string; expiryTimeSeconds: string }> {
    const endpoint = `/applications/${this.packageName}/edits`;
    const requestBody = {};
    
    console.log(`[GooglePlayStoreService] Creating edit for ${this.packageName}`);
    console.log(`[GooglePlayStoreService] Request Body:`, JSON.stringify(requestBody, null, 2));
    
    return this.makeRequest<{ id: string; expiryTimeSeconds: string }>('POST', endpoint, requestBody);
  }

  /**
   * Get current production track state
   * GET /applications/{packageName}/edits/{editId}/tracks/production
   * 
   * @param editId - The edit ID from createEdit
   * @returns Promise with current production track data
   */
  async getProductionTrack(editId: string): Promise<{
    track: string;
    releases: Array<{
      name: string;
      versionCodes: string[];
      status: string;
    }>;
  }> {
    const endpoint = `/applications/${this.packageName}/edits/${editId}/tracks/${this.PRODUCTION_TRACK}`;
    
    console.log(`[GooglePlayStoreService] Getting production track for edit ${editId}`);
    
    return this.makeRequest<{
      track: string;
      releases: Array<{
        name: string;
        versionCodes: string[];
        status: string;
      }>;
    }>('GET', endpoint);
  }

  /**
   * Update production track with new release
   * PUT /applications/{packageName}/edits/{editId}/tracks/production
   * 
   * @param editId - The edit ID
   * @param trackData - The track data to update (includes existing releases + new release)
   * @returns Promise with updated track data
   */
  async updateProductionTrack(
    editId: string,
    trackData: {
      track: string;
      releases: Array<{
        name: string;
        versionCodes: string[];
        status: string;
        userFraction?: number;
        inAppUpdatePriority?: number;
        releaseNotes?: Array<{ language: string; text: string }>;
      }>;
    }
  ): Promise<{
    track: string;
    releases: Array<{
      name: string;
      versionCodes: string[];
      status: string;
    }>;
  }> {
    const endpoint = `/applications/${this.packageName}/edits/${editId}/tracks/${this.PRODUCTION_TRACK}`;
    
    console.log(`[GooglePlayStoreService] Updating production track for edit ${editId}`);
    console.log(`[GooglePlayStoreService] Request Body:`, JSON.stringify(trackData, null, 2));
    
    return this.makeRequest<{
      track: string;
      releases: Array<{
        name: string;
        versionCodes: string[];
        status: string;
      }>;
    }>('PUT', endpoint, trackData);
  }

  /**
   * Validate the edit (dry run)
   * POST /applications/{packageName}/edits/{editId}:validate
   * 
   * @param editId - The edit ID
   * @returns Promise with validation result
   */
  async validateEdit(editId: string): Promise<any> {
    const endpoint = `/applications/${this.packageName}/edits/${editId}:validate`;
    const requestBody = {};
    
    console.log(`[GooglePlayStoreService] Validating edit ${editId}`);
    console.log(`[GooglePlayStoreService] Request Body:`, JSON.stringify(requestBody, null, 2));
    
    return this.makeRequest<any>('POST', endpoint, requestBody);
  }

  /**
   * Commit the edit
   * POST /applications/{packageName}/edits/{editId}:commit
   * 
   * @param editId - The edit ID
   * @returns Promise with commit result
   */
  async commitEdit(editId: string): Promise<{ id: string }> {
    const endpoint = `/applications/${this.packageName}/edits/${editId}:commit`;
    const requestBody = {};
    
    console.log(`[GooglePlayStoreService] Committing edit ${editId}`);
    console.log(`[GooglePlayStoreService] Request Body:`, JSON.stringify(requestBody, null, 2));
    
    return this.makeRequest<{ id: string }>('POST', endpoint, requestBody);
  }

  /**
   * Delete the edit (cleanup on error)
   * DELETE /applications/{packageName}/edits/{editId}
   * 
   * @param editId - The edit ID to delete
   * @returns Promise resolving when delete is successful
   */
  async deleteEdit(editId: string): Promise<void> {
    const endpoint = `/applications/${this.packageName}/edits/${editId}`;
    
    console.log(`[GooglePlayStoreService] Deleting edit ${editId}`);
    
    try {
      await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      console.log(`[GooglePlayStoreService] Edit ${editId} deleted successfully`);
    } catch (error) {
      console.warn(`[GooglePlayStoreService] Failed to delete edit ${editId}, it will expire automatically:`, error);
      // Don't throw - edit will expire automatically
    }
  }

  /**
   * No-op for real API: edit already exists when created via API.
   * Used by resubmission flow when mock: real createEdit + upload bundle, then mock update/validate/commit
   * need a session for that real editId; real service does not need to do anything.
   */
  ensureEditSession(_editId: string): void {
    // No-op: edit already exists on Google when created via createEdit
  }
}

/**
 * Check if mock mode is enabled via environment variable
 */
const isGooglePlayMockMode = (): boolean => {
  const mockEnv = process.env.MOCK_GOOGLE_PLAY_API ?? 'false';
  return mockEnv.toLowerCase() === 'true';
};

/**
 * Factory function to create GooglePlayStoreService from store integration
 * 
 * @param integrationId - The ID of the store integration
 * @returns GooglePlayStoreService or MockGooglePlayStoreService instance based on MOCK_GOOGLE_PLAY_API env var
 */
export async function createGoogleServiceFromIntegration(
  integrationId: string
): Promise<GooglePlayStoreService | MockGooglePlayStoreService> {
  // Check if mock mode is enabled
  const mockEnabled = isGooglePlayMockMode();
  if (mockEnabled) {
    console.log('[GoogleServiceFactory] MOCK_GOOGLE_PLAY_API=true - Using mock Google Play service');
    
    const storeIntegrationController = getStoreIntegrationController();
    const integration = await storeIntegrationController.findById(integrationId);
    const packageName = integration?.appIdentifier ?? 'com.example.app';
    
    return new MockGooglePlayStoreService('mock-access-token', packageName);
  }

  console.log('[GoogleServiceFactory] MOCK_GOOGLE_PLAY_API=false - Using production Google Play API');
  
  const credentialController = getCredentialController();
  const storeIntegrationController = getStoreIntegrationController();
  
  // Get credentials from DB
  const existingCredential = await credentialController.findByIntegrationId(integrationId);
  if (!existingCredential) {
    throw new Error('Google Play Store credentials not found for this integration');
  }

  // Decrypt credential payload
  let decryptedPayload: string;
  try {
    const buffer = existingCredential.encryptedPayload;
    
    if (Buffer.isBuffer(buffer)) {
      decryptedPayload = decryptCredentialsFromStorage(buffer);
    } else {
      decryptedPayload = decryptFromStorage(String(buffer));
    }
  } catch (readError) {
    throw new Error('Failed to decrypt Google Play Store credentials');
  }

  // Parse credential JSON
  let credentialData: any;
  try {
    credentialData = JSON.parse(decryptedPayload);
  } catch (parseError) {
    throw new Error('Failed to parse Google Play Store credential data');
  }

  // Get service account JSON
  const serviceAccountJson = credentialData;
  
  // Fix escaped newlines in private key
  const privateKey = serviceAccountJson.private_key.replace(/\\n/g, '\n');

  // Create GoogleAuth instance with service account credentials
  const credentials: any = {
    type: serviceAccountJson.type,
    private_key: privateKey,
    client_email: serviceAccountJson.client_email,
  };

  // Add optional fields if present
  if (serviceAccountJson.project_id) {
    credentials.project_id = serviceAccountJson.project_id;
  }
  if (serviceAccountJson.private_key_id) {
    credentials.private_key_id = serviceAccountJson.private_key_id;
  }
  if (serviceAccountJson.client_id) {
    credentials.client_id = serviceAccountJson.client_id;
  }
  if (serviceAccountJson.auth_uri) {
    credentials.auth_uri = serviceAccountJson.auth_uri;
  } else {
    credentials.auth_uri = 'https://accounts.google.com/o/oauth2/auth';
  }
  if (serviceAccountJson.token_uri) {
    credentials.token_uri = serviceAccountJson.token_uri;
  } else {
    credentials.token_uri = 'https://oauth2.googleapis.com/token';
  }
  if (serviceAccountJson.auth_provider_x509_cert_url) {
    credentials.auth_provider_x509_cert_url = serviceAccountJson.auth_provider_x509_cert_url;
  }
  if (serviceAccountJson.client_x509_cert_url) {
    credentials.client_x509_cert_url = serviceAccountJson.client_x509_cert_url;
  }

  const googleAuth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/androidpublisher',
    ],
  });

  // Get access token
  const client = await googleAuth.getClient();
  const tokenResponse = await client.getAccessToken();
  const tokenMissing = !tokenResponse.token;
  
  if (tokenMissing) {
    throw new Error('Failed to obtain access token from Google service account');
  }

  // Get appIdentifier (packageName) from integration
  const integration = await storeIntegrationController.findById(integrationId);
  if (!integration) {
    throw new Error('Store integration not found');
  }

  return new GooglePlayStoreService(tokenResponse.token, integration.appIdentifier);
}