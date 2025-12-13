import { BuildPlatform, StoreType } from "./build.constants";

/**
 * Response type for listing build artifacts
 */
export type BuildListItem = {
  id: string;
  artifactPath: string | null;
  downloadUrl: string | null;
  artifactVersionName: string;
  buildNumber: string | null;
  releaseId: string;
  platform: BuildPlatform;
  storeType: StoreType | null;
  regressionId: string | null;
  ciRunId: string | null;
  createdAt: Date;
  updatedAt: Date;
};


