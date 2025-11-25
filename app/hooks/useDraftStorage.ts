import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Configuration for draft storage
 */
export interface DraftStorageConfig<T> {
  /**
   * Unique storage key for this form
   * Example: 'release-config-draft', 'playstore-connection-draft'
   */
  storageKey: string;

  /**
   * Optional: Fields to exclude from storage (sensitive data)
   * Example: ['privateKey', 'password', 'accessToken']
   */
  sensitiveFields?: Array<keyof T | string>;

  /**
   * Optional: Condition to check if draft should be saved
   * Returns true if form has meaningful data to save
   */
  shouldSaveDraft?: (data: T) => boolean;

  /**
   * Optional: TTL in milliseconds (default: 7 days)
   */
  ttl?: number;

  /**
   * Optional: Enable metadata storage (for wizard steps, etc.)
   */
  enableMetadata?: boolean;
}

/**
 * Draft metadata stored with the data
 */
interface DraftMetadata<T> {
  data: T;
  savedAt: string;
  version?: string;
  metadata?: Record<string, any>; // Additional metadata (wizard steps, etc.)
}

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generic hook for form draft storage with auto-save and restore
 * 
 * @template T - The type of form data
 * @param config - Draft storage configuration
 * @param initialData - Initial form data
 * 
 * @example
 * ```tsx
 * const { formData, setFormData, isDraftRestored, clearDraft } = useDraftStorage({
 *   storageKey: 'release-config-draft-{tenantId}',
 *   sensitiveFields: ['githubToken', 'slackWebhook'],
 *   shouldSaveDraft: (data) => !!data.name || !!data.description,
 * }, initialFormData);
 * ```
 */
export function useDraftStorage<T extends Record<string, any>>(
  config: DraftStorageConfig<T>,
  initialData: T
) {
  const { storageKey, sensitiveFields = [], shouldSaveDraft, ttl = DEFAULT_TTL, enableMetadata = false } = config;

  // Track if save was successful (to prevent auto-save on success)
  const saveSuccessfulRef = useRef(false);
  
  // Store metadata separately if enabled (e.g., wizard step)
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  /**
   * Load draft from localStorage
   */
  const loadDraftFromStorage = useCallback((): { data: T | null; metadata: Record<string, any> } => {
    if (typeof window === 'undefined') return { data: null, metadata: {} };

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return { data: null, metadata: {} };

      const draft: DraftMetadata<T> = JSON.parse(stored);
      
      // Check if draft is expired
      const savedAt = new Date(draft.savedAt).getTime();
      const now = Date.now();
      if (now - savedAt > ttl) {
        console.log(`[useDraftStorage] Draft expired for key: ${storageKey}`);
        localStorage.removeItem(storageKey);
        return { data: null, metadata: {} };
      }

      console.log(`[useDraftStorage] Draft restored for key: ${storageKey}`);
      return { 
        data: draft.data, 
        metadata: draft.metadata || {} 
      };
    } catch (error) {
      console.error(`[useDraftStorage] Failed to load draft for key: ${storageKey}`, error);
      return { data: null, metadata: {} };
    }
  }, [storageKey, ttl]);

  /**
   * Initialize form data with draft if available
   */
  const [formData, setFormData] = useState<T>(() => {
    const { data: draft, metadata: loadedMetadata } = loadDraftFromStorage();
    
    // Restore metadata if enabled
    if (enableMetadata && loadedMetadata && Object.keys(loadedMetadata).length > 0) {
      // setMetadata will happen in useEffect to avoid state update during render
      setTimeout(() => setMetadata(loadedMetadata), 0);
    }
    
    // Merge draft with defaults (draft already has null values filtered out during save)
    return draft ? { ...initialData, ...draft } : initialData;
  });

  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(() => {
    const { data: draft } = loadDraftFromStorage();
    return !!draft;
  });

  /**
   * Remove sensitive fields from data before storage
   */
  const sanitizeData = useCallback((data: T): Partial<T> => {
    const sanitized = { ...data };

    // Remove sensitive fields
    sensitiveFields.forEach((field) => {
      const fieldPath = String(field).split('.');
      
      if (fieldPath.length === 1) {
        // Simple field: delete data.privateKey
        delete sanitized[fieldPath[0]];
      } else {
        // Nested field: delete data.serviceAccount.privateKey
        let current: any = sanitized;
        for (let i = 0; i < fieldPath.length - 1; i++) {
          if (current[fieldPath[i]]) {
            current = current[fieldPath[i]];
          }
        }
        if (current) {
          delete current[fieldPath[fieldPath.length - 1]];
        }
      }
    });

    return sanitized;
  }, [sensitiveFields]);

  /**
   * Save draft to localStorage (with optional metadata)
   */
  const saveDraft = useCallback((data: T, meta?: Record<string, any>) => {
    if (typeof window === 'undefined') return;

    try {
      const sanitizedData = sanitizeData(data);
      const draft: DraftMetadata<Partial<T>> = {
        data: sanitizedData,
        savedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Include metadata if enabled and provided
      if (enableMetadata && (meta || Object.keys(metadata).length > 0)) {
        draft.metadata = meta || metadata;
      }

      localStorage.setItem(storageKey, JSON.stringify(draft));
      console.log(`[useDraftStorage] Draft saved for key: ${storageKey}`);
    } catch (error) {
      console.error(`[useDraftStorage] Failed to save draft for key: ${storageKey}`, error);
    }
  }, [storageKey, sanitizeData, enableMetadata, metadata]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(storageKey);
      setIsDraftRestored(false);
      if (enableMetadata) {
        setMetadata({}); // Clear metadata state
      }
      console.log(`[useDraftStorage] Draft cleared for key: ${storageKey}`);
    } catch (error) {
      console.error(`[useDraftStorage] Failed to clear draft for key: ${storageKey}`, error);
    }
  }, [storageKey, enableMetadata]);

  /**
   * Check if draft exists
   */
  const hasDraft = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(storageKey);
  }, [storageKey]);

  /**
   * Update metadata without saving the entire draft
   * Useful for tracking wizard steps, progress, etc.
   */
  const updateMetadata = useCallback((updates: Record<string, any>) => {
    if (!enableMetadata) {
      console.warn('[useDraftStorage] Metadata is not enabled for this storage');
      return;
    }
    setMetadata((prev) => ({ ...prev, ...updates }));
  }, [enableMetadata]);

  /**
   * Mark save as successful (prevents auto-save on unmount)
   */
  const markSaveSuccessful = useCallback(() => {
    saveSuccessfulRef.current = true;
    clearDraft();
  }, [clearDraft]);

  /**
   * Auto-save draft on unmount (when user closes form without saving)
   */
  useEffect(() => {
    return () => {
      // Only save if form was not successfully submitted
      if (!saveSuccessfulRef.current) {
        // Check if we should save based on custom condition
        const shouldSave = shouldSaveDraft ? shouldSaveDraft(formData) : true;
        
        if (shouldSave) {
          saveDraft(formData);
        }
      }
    };
  }, [formData, saveDraft, shouldSaveDraft]);

  return {
    formData, // Current form data state
    setFormData, // Update form data
    isDraftRestored, // Whether a draft was restored on mount
    saveDraft: () => saveDraft(formData), // Manually save draft
    clearDraft, // Clear draft from storage
    hasDraft, // Check if draft exists
    markSaveSuccessful, // Mark form submission as successful (prevents auto-save and clears draft)
    metadata: enableMetadata ? metadata : undefined, // Additional metadata (e.g., wizard step) - only if enableMetadata is true
    updateMetadata: enableMetadata ? updateMetadata : undefined, // Update metadata - only if enableMetadata is true
  };
}

/**
 * Utility function to generate storage keys with tenant/org context
 */
export function generateStorageKey(
  formType: string,
  tenantId: string,
  additionalContext?: string
): string {
  const parts = ['draft', formType, tenantId];
  if (additionalContext) {
    parts.push(additionalContext);
  }
  return parts.join('-');
}

