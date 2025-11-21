// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as express from "express";
import multer = require("multer");

const UPLOAD_SIZE_LIMIT_MB: number = parseInt(process.env.UPLOAD_SIZE_LIMIT_MB) || 200;

// Lazy initialization - multer instance will be created on first use
let multerInstance: multer.Multer | null = null;
let maxFileSizeMb: number = UPLOAD_SIZE_LIMIT_MB;

/**
 * Initialize multer at server startup time
 * This ensures environment variables are loaded and configuration is set correctly
 */
export function initializeFileUploadManager(): void {
  try {
    maxFileSizeMb = parseInt(process.env.UPLOAD_SIZE_LIMIT_MB) || 200;
    
    multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeMb * 1048576,
        fieldSize: 10 * 1024 * 1024, // 10MB for field values
        fields: 50, // Maximum number of non-file fields
        files: 10, // Maximum number of file fields
    },
    });
    
    console.log(`[FileUpload] Multer initialized with max file size: ${maxFileSizeMb}MB`);
  } catch (error) {
    console.error('[FileUpload] Error initializing multer:', error);
    // Don't throw - allow lazy initialization on first use
  }
}

/**
 * Get or create multer instance (lazy initialization fallback)
 */
function getMulterInstance(): multer.Multer {
  if (!multerInstance) {
    console.warn('[FileUpload] Multer not initialized, initializing now...');
    initializeFileUploadManager();
  }
  return multerInstance!;
}

export function fileUploadMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const contentType = req.headers['content-type'] || '';
  
  // Only process multipart requests
  if (!contentType.includes('multipart/')) {
    return next();
  }
  
  // Use .any() to accept any field name (both files and regular fields)
  // This must be called directly to ensure the stream is handled correctly
  const multerMiddleware = getMulterInstance().any();
  multerMiddleware(req, res, (err: any): void => {
    if (err) {
      console.error('[Multer] Error processing file upload:', {
        code: err.code,
        message: err.message,
        field: err.field,
        stack: err.stack
      });
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).send(`The uploaded file is larger than the size limit of ${maxFileSizeMb} megabytes.`);
      } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
        res.status(400).send(`Unexpected file field: ${err.field}`);
      } else {
        console.error('[Multer] Unexpected error:', err.message, err.stack);
        next(err);
      }
    } else {
      next();
    }
  });
}

export function getFileWithField(req: Express.Request, field: string): Express.Multer.File {
  for (const i in req.files) {
    if (req.files[i].fieldname === field) {
      return req.files[i];
    }
  }

  return null;
}

export function createTempFileFromBuffer(buffer: Buffer): string {
  const tmpPath = require("os").tmpdir();
  const tmpFilePath = require("path").join(tmpPath, "tempfile");
  require("fs").writeFileSync(tmpFilePath, buffer);
  return tmpFilePath;
}
