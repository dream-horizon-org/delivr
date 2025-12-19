/**
 * Manual Upload Service
 * 
 * Handles manual build uploads using the release_uploads staging table.
 * 
 * Flow:
 * 1. User uploads artifact via API
 * 2. Validate upload is allowed (using UploadValidationService)
 * 3. Upload to S3 using BuildArtifactService and get artifact path
 * 4. Create/upsert entry in release_uploads table
 * 5. Return status (including whether all platforms are ready)
 * 
 * Note: Task consumption happens separately when TaskExecutor runs.
 * This service only handles the staging of uploads.
 * 
 * Reference: docs/MANUAL_BUILD_UPLOAD_FLOW.md
 */

import { ReleaseUploadsRepository, CreateReleaseUploadDto } from '../../models/release/release-uploads.repository';
import { UploadStage } from '../../models/release/release-uploads.sequelize.model';
import { ReleaseRepository } from '../../models/release/release.repository';
import { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import { PlatformName } from '../../models/release/release.interface';
import { UploadValidationService } from './upload-validation.service';
import { BuildArtifactService } from './build/build-artifact.service';

// ============================================================================
// TYPES
// ============================================================================

export type ManualUploadResult = {
  success: boolean;
  error?: string;
  uploadId?: string;
  platform?: PlatformName;
  stage?: UploadStage;
  downloadUrl?: string;
  internalTrackLink?: string | null;
  uploadedPlatforms?: PlatformName[];
  missingPlatforms?: PlatformName[];
  allPlatformsReady?: boolean;
};

export type UploadStatusResult = {
  releaseId: string;
  stage: UploadStage;
  platforms: Array<{
    platform: PlatformName;
    hasUpload: boolean;
    uploadId?: string;
    uploadedAt?: Date;
  }>;
  allPlatformsReady: boolean;
  missingPlatforms: PlatformName[];
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ManualUploadService {
  constructor(
    private readonly releaseUploadsRepo: ReleaseUploadsRepository,
    private readonly releaseRepo: ReleaseRepository,
    private readonly platformMappingRepo: ReleasePlatformTargetMappingRepository,
    private readonly validationService: UploadValidationService,
    private readonly buildArtifactService: BuildArtifactService
  ) {}

  /**
   * Handle a manual build upload
   * 
   * @param releaseId Release ID
   * @param stage Stage the upload is for (KICKOFF, REGRESSION, PRE_RELEASE)
   * @param platform Platform being uploaded
   * @param file File buffer to upload
   * @param originalFilename Original filename to preserve extension (.ipa, .apk, .aab)
   * @returns Result with upload status
   */
  async handleUpload(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName,
    file: Buffer,
    originalFilename: string
  ): Promise<ManualUploadResult> {
    // Step 1: Validate upload is allowed
    const validation = await this.validationService.validateUpload(releaseId, stage, platform);
    const validationFailed = !validation.valid;
    if (validationFailed) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Step 2: Get release for tenant ID
    const release = await this.releaseRepo.findById(releaseId);
    const releaseNotFound = !release;
    if (releaseNotFound) {
      return {
        success: false,
        error: 'Release not found',
      };
    }

    // Step 3: Get artifactVersionName from platform mapping
    const platformMappings = await this.platformMappingRepo.getByReleaseId(releaseId);
    const platformMapping = platformMappings.find(m => m.platform === platform);
    const mappingNotFound = !platformMapping;
    if (mappingNotFound) {
      return {
        success: false,
        error: `Platform mapping not found for ${platform}`,
      };
    }
    const artifactVersionName = platformMapping.version;

    // Step 4: Upload to S3 (and Play Store for AAB) using BuildArtifactService
    let artifactPath: string;
    let downloadUrl: string;
    let internalTrackLink: string | null = null;
    try {
      const uploadResult = await this.buildArtifactService.uploadStagingArtifact({
        tenantId: release.tenantId,
        releaseId,
        platform,
        artifactVersionName,
        artifactBuffer: file,
        originalFilename,
      });
      artifactPath = uploadResult.s3Uri;
      downloadUrl = uploadResult.downloadUrl;
      internalTrackLink = uploadResult.internalTrackLink;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return {
        success: false,
        error: `Failed to upload artifact: ${errorMessage}`,
      };
    }

    // Step 5: Create/upsert entry in release_uploads table
    // Only saved if all uploads (S3 + Play Store for AAB) succeed
    const uploadData: CreateReleaseUploadDto = {
      tenantId: release.tenantId,
      releaseId,
      platform,
      stage,
      artifactPath,
      internalTrackLink,
    };

    const upload = await this.releaseUploadsRepo.upsert(uploadData);

    console.log(
      `[ManualUploadService] Upload staged: ${platform} for ${stage}. ` +
      `Release: ${releaseId}, Upload: ${upload.id}`
    );

    // Step 6: Check platform status
    const requiredPlatforms = await this.getRequiredPlatforms(releaseId);
    const platformStatus = await this.releaseUploadsRepo.checkAllPlatformsReady(
      releaseId,
      stage,
      requiredPlatforms
    );

    return {
      success: true,
      uploadId: upload.id,
      platform,
      stage,
      downloadUrl,
      internalTrackLink,
      uploadedPlatforms: platformStatus.uploadedPlatforms,
      missingPlatforms: platformStatus.missingPlatforms,
      allPlatformsReady: platformStatus.allReady,
    };
  }

  /**
   * Get current upload status for a release and stage
   */
  async getUploadStatus(releaseId: string, stage: UploadStage): Promise<UploadStatusResult> {
    const requiredPlatforms = await this.getRequiredPlatforms(releaseId);
    const uploads = await this.releaseUploadsRepo.findUnused(releaseId, stage);

    const platforms = requiredPlatforms.map(platform => {
      const upload = uploads.find(u => u.platform === platform);
      const hasUpload = upload !== undefined;
      return {
        platform,
        hasUpload,
        uploadId: upload?.id,
        uploadedAt: upload?.createdAt,
      };
    });

    const missingPlatforms = platforms
      .filter(p => !p.hasUpload)
      .map(p => p.platform);

    return {
      releaseId,
      stage,
      platforms,
      allPlatformsReady: missingPlatforms.length === 0,
      missingPlatforms,
    };
  }

  /**
   * Get upload for a specific platform and stage
   */
  async getUpload(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<ManualUploadResult> {
    const upload = await this.releaseUploadsRepo.findUnusedByPlatform(releaseId, stage, platform);

    const noUpload = !upload;
    if (noUpload) {
      return {
        success: false,
        error: `No upload found for ${platform} in stage ${stage}`,
      };
    }

    return {
      success: true,
      uploadId: upload.id,
      platform: upload.platform,
      stage: upload.stage,
    };
  }

  /**
   * Delete an unused upload
   */
  async deleteUpload(
    releaseId: string,
    stage: UploadStage,
    platform: PlatformName
  ): Promise<{ success: boolean; error?: string }> {
    const upload = await this.releaseUploadsRepo.findUnusedByPlatform(releaseId, stage, platform);

    const noUpload = !upload;
    if (noUpload) {
      return {
        success: false,
        error: `No upload found for ${platform} in stage ${stage}`,
      };
    }

    const isAlreadyUsed = upload.isUsed;
    if (isAlreadyUsed) {
      return {
        success: false,
        error: 'Cannot delete an upload that has already been consumed',
      };
    }

    await this.releaseUploadsRepo.delete(upload.id);

    console.log(
      `[ManualUploadService] Upload deleted: ${platform} for ${stage}. ` +
      `Release: ${releaseId}, Upload: ${upload.id}`
    );

    return { success: true };
  }

  /**
   * Get required platforms for a release
   */
  private async getRequiredPlatforms(releaseId: string): Promise<PlatformName[]> {
    const mappings = await this.platformMappingRepo.getByReleaseId(releaseId);
    return mappings.map(m => m.platform as PlatformName);
  }
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use ManualUploadService.handleUpload instead
 * Legacy function for backward compatibility with existing code
 */
export const handleManualBuildUpload = async (
  _releaseId: string,
  _taskId: string,
  _platform: PlatformName,
  _artifactPath: string,
  _buildRepo: unknown,
  _taskRepo: unknown,
  _releaseRepo: unknown,
  _platformMappingRepo: unknown
): Promise<{ success: boolean; error?: string; allPlatformsUploaded: boolean }> => {
  // This is a stub for backward compatibility
  // Real implementation now uses ManualUploadService with release_uploads table
  throw new Error(
    'handleManualBuildUpload is deprecated. Use ManualUploadService.handleUpload with release_uploads staging table.'
  );
};

export default ManualUploadService;
