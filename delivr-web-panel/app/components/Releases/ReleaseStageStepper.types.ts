/**
 * ReleaseStageStepper Types
 */

// Stage definition type - can be extended from API
export type ReleaseStage = {
  key: string;
  label: string;
  description: string;
  iconName: string;
  isNavigable: boolean;
  navigationPath?: string; // Where to navigate when clicked
};

export type ReleaseStageStepperProps = {
  releaseId: string;
  org: string;
  releaseBranch?: string;
  // API-driven props
  releaseStatus?: string; // Current status from API
  currentStageIndex?: number; // Direct stage index (preferred, from API)
  stages?: ReleaseStage[]; // Custom stages from API (optional)
};

