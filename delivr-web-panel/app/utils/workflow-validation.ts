/**
 * Workflow Validation Utilities
 * Reusable functions for validating workflow data
 */

import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';

/**
 * Check if a workflow name already exists (case-insensitive)
 * Excludes the current workflow when editing
 * 
 * @param name - The workflow name to check
 * @param workflows - Array of all existing workflows
 * @param options - Options for validation
 * @param options.existingWorkflow - The current workflow being edited (if any)
 * @param options.workflowId - Fallback workflow ID from URL params
 * @param options.isEditMode - Whether we're in edit mode
 * @returns Error message if duplicate found, null otherwise
 */
export function validateWorkflowName(
  name: string,
  workflows: CICDWorkflow[],
  options: {
    existingWorkflow?: CICDWorkflow | null;
    workflowId?: string;
    isEditMode?: boolean;
  } = {}
): string | null {
  if (!name || !name.trim()) {
    return 'Workflow name is required';
  }

  if (!workflows || workflows.length === 0) {
    return null; // No existing workflows, name is valid
  }

  const trimmedName = name.trim().toLowerCase();
  const { existingWorkflow, workflowId, isEditMode = false } = options;

  // Get current workflow ID (use existingWorkflow.id or workflowId as fallback)
  const currentWorkflowId = existingWorkflow?.id || workflowId;
  // Find duplicate workflow
  const duplicateWorkflow = workflows.find((wf) => {
    const isNameMatch = wf.displayName?.toLowerCase() === trimmedName;

    if (!isNameMatch) {
      return false; // Name doesn't match, not a duplicate
    }

    // If editing, exclude current workflow (by ID)
    if (isEditMode && currentWorkflowId) {
      // Compare IDs as strings to handle any type mismatches (number vs string)
      const wfIdStr = String(wf.id || '').trim();
      const currentIdStr = String(currentWorkflowId || '').trim();
      // If IDs match, this is the current workflow - not a duplicate
      return wfIdStr !== currentIdStr;
    }

    // If creating, any name match is a duplicate
    return true;
  });

  if (duplicateWorkflow) {
    return 'A workflow with this name already exists. Please use a different name.';
  }

  return null;
}

