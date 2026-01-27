import { S3 } from 'aws-sdk';
import { Readable } from 'stream';

/**
 * Minimal S3 upload utility.
 * Uses environment configuration already present in the project.
 */
type UploadParams = {
  bucketName: string;
  key: string;
  body: Buffer | Readable;
  contentType?: string;
  s3?: S3;
};

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

const createS3Client = (): S3 => {
  const region = process.env.S3_REGION;
  if (process.env.NODE_ENV === 'dev') {
    return new S3({
      region,
      endpoint: process.env.S3_ENDPOINT,
      s3ForcePathStyle: true,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    });
  }
  return new S3({ region });
};

/**
 * Upload a file to S3 at the provided bucket/key.
 * Returns the S3 key on success.
 */
export const uploadToS3 = async (params: UploadParams): Promise<string> => {
  const { bucketName, key, body, contentType, s3: providedS3 } = params;
  const s3 = providedS3 ?? createS3Client();

  const finalContentType = contentType && contentType.trim().length > 0 ? contentType : DEFAULT_CONTENT_TYPE;
  const isBuffer = Buffer.isBuffer(body);
  const uploadBody = isBuffer ? body : body;

  await s3
    .putObject({
      Bucket: bucketName,
      Key: key,
      Body: uploadBody as any,
      ContentType: finalContentType
    })
    .promise();

  return key;
};

/**
 * Infer a reasonable content-type from filename extension.
 */
export const inferContentType = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.apk')) return 'application/vnd.android.package-archive';
  if (lower.endsWith('.aab')) return 'application/octet-stream';
  if (lower.endsWith('.ipa')) return 'application/octet-stream';
  return DEFAULT_CONTENT_TYPE;
};

/**
 * Generate a presigned GET URL for downloading an S3 object.
 */
export const generatePresignedGetUrl = async (params: {
  bucketName: string;
  key: string;
  expiresSeconds?: number;
  s3?: S3;
}): Promise<string> => {
  const { bucketName, key, expiresSeconds = 3600, s3 } = params;
  const client = s3 ?? createS3Client();
  return client.getSignedUrlPromise('getObject', {
    Bucket: bucketName,
    Key: key,
    Expires: expiresSeconds
  });
};


