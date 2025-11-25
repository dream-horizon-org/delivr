/**
 * S3 path utilities for standardized artifact storage paths
 */
type BuildS3PathParams = {
  tenantId: string;
  releaseId: string;
  storeType: string;
  artifactVersionName: string;
  artifactVersionCode: string;
};

/**
 * Build S3 URI (s3://bucket/key) for display/logging.
 */
export const buildS3Uri = (bucketName: string, key: string): string => {
  const cleanedBucket = String(bucketName).trim();
  const cleanedKey = String(key).trim();
  if (cleanedBucket.length === 0 || cleanedKey.length === 0) {
    throw new Error('Invalid bucket or key for building S3 URI');
  }
  return `s3://${cleanedBucket}/${cleanedKey}`;
};

/**
 * Parse an s3://bucket/key URI into { bucket, key }.
 */
export const parseS3Uri = (uri: string): { bucket: string; key: string } => {
  const isString = typeof uri === 'string';
  if (!isString || !uri.startsWith('s3://')) {
    throw new Error('Invalid S3 URI format');
  }
  const withoutScheme = uri.slice(5); // remove 's3://'
  const slashIndex = withoutScheme.indexOf('/');
  const invalid = slashIndex <= 0 || slashIndex === withoutScheme.length - 1;
  if (invalid) {
    throw new Error('Invalid S3 URI: missing bucket or key');
  }
  const bucket = withoutScheme.slice(0, slashIndex);
  const key = withoutScheme.slice(slashIndex + 1);
  return { bucket, key };
};

/**
 * Build S3 key for a manual build artifact WITHOUT version code in the path.
 * Example:
 * {tenantId}/{releaseId}/{storeType}/{artifact_version_name}/{filename}
 * Where filename typically is "{artifact_version_code}.{ext}"
 */
export const buildArtifactS3Key = (
  params: Omit<BuildS3PathParams, 'artifactVersionCode'>,
  fileName: string
): string => {
  const { tenantId, releaseId, storeType, artifactVersionName } = params;

  const cleanedTenantId = String(tenantId).trim();
  const cleanedReleaseId = String(releaseId).trim();
  const cleanedStoreType = String(storeType).trim();
  const cleanedVersionName = String(artifactVersionName).trim();
  const cleanedFileName = String(fileName).trim();

  const invalid =
    cleanedTenantId.length === 0 ||
    cleanedReleaseId.length === 0 ||
    cleanedStoreType.length === 0 ||
    cleanedVersionName.length === 0 ||
    cleanedFileName.length === 0;

  if (invalid) {
    throw new Error('Invalid parameters for building S3 key (without version code)');
  }

  return [
    cleanedTenantId,
    cleanedReleaseId,
    cleanedStoreType,
    cleanedVersionName,
    cleanedFileName
  ].join('/');
};

/**
 * Build a standardized artifact filename, preserving the original extension (lowercased).
 * Falls back to 'bin' when no extension is present.
 */
export const deriveStandardArtifactFilename = (originalName: string, baseName: string): string => {
  const safeOriginal = typeof originalName === 'string' ? originalName : '';
  const dotIndex = safeOriginal.lastIndexOf('.');
  const hasExtension = dotIndex > -1 && dotIndex < safeOriginal.length - 1;
  const fileExt = hasExtension ? safeOriginal.slice(dotIndex + 1).toLowerCase() : 'bin';
  return `${baseName}.${fileExt}`;
};


