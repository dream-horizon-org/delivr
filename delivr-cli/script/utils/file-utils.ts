import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";
import * as temp from "temp";

export function isBinaryOrZip(path: string): boolean {
  return path.search(/\.zip$/i) !== -1 || path.search(/\.apk$/i) !== -1 || path.search(/\.ipa$/i) !== -1;
}

export function isDirectory(path: string): boolean {
  return fs.statSync(path).isDirectory();
}

export function fileExists(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    return false;
  }
};

export function copyFileToTmpDir(filePath: string): string {
  if (!isDirectory(filePath)) {
    const outputFolderPath: string = temp.mkdirSync("code-push");
    rimraf.sync(outputFolderPath);
    fs.mkdirSync(outputFolderPath);

    const outputFilePath: string = path.join(outputFolderPath, path.basename(filePath));
    fs.writeFileSync(outputFilePath, fs.readFileSync(filePath));

    return outputFolderPath;
  }
}

export function fileDoesNotExistOrIsDirectory(path: string): boolean {
  try {
    return isDirectory(path);
  } catch (error) {
    return true;
  }
}

export function normalizePath(filePath: string): string {
  //replace all backslashes coming from cli running on windows machines by slashes
  return filePath.replace(/\\/g, "/");
}

const ALLOWED_AAB_ARTIFACT_EXTENSIONS = [".aab"] as const;
const ALLOWED_REGRESSION_ARTIFACT_EXTENSIONS = [".apk", ".ipa"] as const;

export const isValidAABArtifactExtension = (filePath: string): boolean => {
  const extension = path.extname(filePath).toLowerCase();
  return ALLOWED_AAB_ARTIFACT_EXTENSIONS.includes(extension as typeof ALLOWED_AAB_ARTIFACT_EXTENSIONS[number]);
};

export const getAllowedAABArtifactExtensions = (): string => {
  return ALLOWED_AAB_ARTIFACT_EXTENSIONS.join(", ");
};

export const isValidRegressionArtifactExtension = (filePath: string): boolean => {
  const extension = path.extname(filePath).toLowerCase();
  return ALLOWED_REGRESSION_ARTIFACT_EXTENSIONS.includes(extension as typeof ALLOWED_REGRESSION_ARTIFACT_EXTENSIONS[number]);
};

export const getAllowedRegressionArtifactExtensions = (): string => {
  return ALLOWED_REGRESSION_ARTIFACT_EXTENSIONS.join(", ");
};
