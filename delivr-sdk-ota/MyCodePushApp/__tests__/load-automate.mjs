/**
 * ES Module loader for automate.mjs
 * This file is loaded outside Jest's context using a child process
 */
import * as automate from './automate.mjs';

// Export all functions
export {
  run,
  directoryChange,
  updateTemplateFileName,
  revertTemplateFileName,
  deleteTestingDirectory,
  createSubFolderInTestingDir,
  moveAssets,
  corruptBundle,
  addImage,
  removeImage,
} from './automate.mjs';

