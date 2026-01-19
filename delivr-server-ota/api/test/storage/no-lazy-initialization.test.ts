/**
 * No Lazy Initialization Tests (TDD)
 * 
 * Tests that verify NO lazy initialization patterns exist in release orchestration files.
 * All services and repositories must be actively initialized in aws-storage.ts setup().
 * 
 * These tests ensure:
 * - No nullable service/repository properties (`| null`, `| undefined`)
 * - No optional service/repository parameters (`?`)
 * - No lazy initialization patterns (`?? null`, `?? undefined`)
 * - No fallback cases (creating instances when not available)
 * - All services/repositories are required parameters
 * - Services are always available (not conditional)
 * 
 * ⚠️ TDD APPROACH: These tests are written BEFORE the migration.
 * They will FAIL until:
 * - All nullable/optional service/repository types are removed
 * - All lazy initialization patterns are removed
 * - All fallback cases are removed
 * - All services/repositories are required parameters
 * 
 * This is intentional - write tests first, then implement migration to make them pass.
 */

import * as fs from 'fs';
import * as path from 'path';

// Release-related directories to check
const RELEASE_DIRECTORIES = [
  'api/script/services/release',
  'api/script/controllers/release',
  'api/script/routes/release',
];

// Files to exclude (test files, interfaces, types)
const EXCLUDE_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.interface\.ts$/,
  /\.types\.ts$/,
  /\.enum\.ts$/,
  /\.constants\.ts$/,
  /\.utils\.ts$/,
];

// Patterns to detect lazy initialization
const LAZY_INIT_PATTERNS = [
  {
    name: 'Nullable property type',
    pattern: /(?:private|public|protected)\s+\w+:\s*\w+\s*\|\s*null\s*[;=]/g,
    description: 'Service/repository property declared as nullable (| null)',
  },
  {
    name: 'Undefined property type',
    pattern: /(?:private|public|protected)\s+\w+:\s*\w+\s*\|\s*undefined\s*[;=]/g,
    description: 'Service/repository property declared as undefined (| undefined)',
  },
  {
    name: 'Optional parameter',
    pattern: /(?:private|public|protected)?\s*\w+\??\s*:\s*\w+(?:Service|Repository|Controller)\s*\?/g,
    description: 'Service/repository parameter declared as optional (?)',
  },
  {
    name: 'Null coalescing assignment',
    pattern: /this\.\w+\s*=\s*\w+\s*\?\?\s*null/g,
    description: 'Lazy initialization with null coalescing (?? null)',
  },
  {
    name: 'Undefined coalescing assignment',
    pattern: /this\.\w+\s*=\s*\w+\s*\?\?\s*undefined/g,
    description: 'Lazy initialization with undefined coalescing (?? undefined)',
  },
  {
    name: 'Conditional service access',
    pattern: /let\s+\w+(?:Service|Repository|Controller)\s*:\s*\w+\s*\|\s*undefined/g,
    description: 'Conditional service access with undefined type',
  },
  {
    name: 'Fallback case comment',
    pattern: /\/\/\s*(?:Fallback|fallback|FALLBACK).*should not happen|should not occur/i,
    description: 'Fallback case comment indicating lazy initialization',
  },
  {
    name: 'Fallback repository creation',
    pattern: /new\s+\w+Repository\s*\(/g,
    description: 'Creating repository instance (should use from storage)',
  },
  {
    name: 'Null check for service',
    pattern: /if\s*\(\s*!?\s*this\.\w+(?:Service|Repository|Controller)\s*\)/g,
    description: 'Null check for service/repository (should always be available)',
  },
];

// Service/Repository names to check (release-related)
const SERVICE_NAMES = [
  'Service',
  'Repository',
  'Controller',
];

// Helper function to check if file should be excluded
function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

// Helper function to check if line contains a service/repository
function isServiceOrRepository(line: string): boolean {
  return SERVICE_NAMES.some(name => line.includes(name));
}

// Helper function to get all TypeScript files in directory
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walkDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  try {
    walkDir(dir);
  } catch (error) {
    // Directory doesn't exist, skip
  }
  
  return files;
}

// Helper function to analyze file for lazy initialization patterns
function analyzeFile(filePath: string): Array<{
  pattern: string;
  line: number;
  content: string;
  description: string;
}> {
  const issues: Array<{
    pattern: string;
    line: number;
    content: string;
    description: string;
  }> = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Check each pattern
    for (const patternInfo of LAZY_INIT_PATTERNS) {
      const matches = content.matchAll(patternInfo.pattern);
      
      for (const match of matches) {
        // Find line number
        const matchIndex = match.index ?? 0;
        const beforeMatch = content.substring(0, matchIndex);
        const lineNumber = beforeMatch.split('\n').length;
        const lineContent = lines[lineNumber - 1]?.trim() || '';
        
        // Only flag if it's related to services/repositories
        if (isServiceOrRepository(lineContent) || patternInfo.name.includes('Fallback')) {
          issues.push({
            pattern: patternInfo.name,
            line: lineNumber,
            content: lineContent,
            description: patternInfo.description,
          });
        }
      }
    }
  } catch (error) {
    // File read error, skip
  }
  
  return issues;
}

describe('No Lazy Initialization in Release Files', () => {
  const projectRoot = path.resolve(__dirname, '../../..');
  const allIssues: Array<{
    file: string;
    pattern: string;
    line: number;
    content: string;
    description: string;
  }> = [];
  
  beforeAll(() => {
    // Collect all issues from release directories
    for (const dir of RELEASE_DIRECTORIES) {
      const fullDir = path.join(projectRoot, dir);
      const files = getAllTsFiles(fullDir);
      
      for (const file of files) {
        if (shouldExcludeFile(file)) {
          continue;
        }
        
        const issues = analyzeFile(file);
        for (const issue of issues) {
          allIssues.push({
            file: path.relative(projectRoot, file),
            ...issue,
          });
        }
      }
    }
  });
  
  describe('TaskExecutor - No Nullable Repositories', () => {
    it('should not have nullable releaseUploadsRepo property', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('task-executor.ts') &&
          issue.content.includes('releaseUploadsRepo') &&
          (issue.pattern.includes('Nullable') || issue.pattern.includes('Optional'))
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have nullable cronJobRepo property', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('task-executor.ts') &&
          issue.content.includes('cronJobRepo') &&
          (issue.pattern.includes('Nullable') || issue.pattern.includes('Optional'))
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have nullable regressionCycleRepo property', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('task-executor.ts') &&
          issue.content.includes('regressionCycleRepo') &&
          (issue.pattern.includes('Nullable') || issue.pattern.includes('Optional'))
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have lazy initialization for repositories', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('task-executor.ts') &&
          (issue.pattern.includes('coalescing') || issue.pattern.includes('Null coalescing'))
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have fallback case for regressionCycleRepo', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('task-executor.ts') &&
          issue.pattern.includes('Fallback') &&
          issue.content.includes('regressionCycleRepo')
      );
      
      expect(issues).toEqual([]);
    });
  });
  
  describe('ReleaseManagementController - No Nullable Services', () => {
    it('should not have nullable manualUploadService property', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.controller.ts') &&
          issue.content.includes('manualUploadService') &&
          (issue.pattern.includes('Nullable') || issue.pattern.includes('Optional'))
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have lazy initialization for manualUploadService', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.controller.ts') &&
          issue.content.includes('manualUploadService') &&
          issue.pattern.includes('coalescing')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have null check for manualUploadService', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.controller.ts') &&
          issue.content.includes('manualUploadService') &&
          issue.pattern.includes('Null check')
      );
      
      expect(issues).toEqual([]);
    });
  });
  
  describe('Release Management Routes - No Conditional Service Access', () => {
    it('should not have conditional manualUploadService access', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.ts') &&
          issue.content.includes('manualUploadService') &&
          issue.pattern.includes('Conditional')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have conditional buildCallbackService access', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.ts') &&
          issue.content.includes('buildCallbackService') &&
          issue.pattern.includes('Conditional')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have fallback comments for services', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('release-management.ts') &&
          issue.pattern.includes('Fallback')
      );
      
      expect(issues).toEqual([]);
    });
  });
  
  describe('CronJobService - No Optional Services', () => {
    it('should not have optional releaseStatusService', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('cron-job.service.ts') &&
          issue.content.includes('releaseStatusService') &&
          issue.pattern.includes('Optional')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have optional repositories in constructor', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('cron-job.service.ts') &&
          (issue.content.includes('Repository') || issue.content.includes('Service')) &&
          issue.pattern.includes('Optional')
      );
      
      expect(issues).toEqual([]);
    });
  });
  
  describe('CronJobStateMachine - No Optional Repositories', () => {
    it('should not have optional platformMappingRepo', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('cron-job-state-machine.ts') &&
          issue.content.includes('platformMappingRepo') &&
          issue.pattern.includes('Optional')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have optional releaseUploadsRepo', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('cron-job-state-machine.ts') &&
          issue.content.includes('releaseUploadsRepo') &&
          issue.pattern.includes('Optional')
      );
      
      expect(issues).toEqual([]);
    });
    
    it('should not have optional buildRepo', () => {
      const issues = allIssues.filter(
        issue => 
          issue.file.includes('cron-job-state-machine.ts') &&
          issue.content.includes('buildRepo') &&
          issue.pattern.includes('Optional')
      );
      
      expect(issues).toEqual([]);
    });
  });
  
  describe('All Release Files - General Lazy Initialization Patterns', () => {
    it('should not have any nullable service/repository properties', () => {
      const nullableIssues = allIssues.filter(
        issue => 
          issue.pattern.includes('Nullable') &&
          (issue.content.includes('Service') || issue.content.includes('Repository'))
      );
      
      if (nullableIssues.length > 0) {
        console.error('\n❌ Found nullable service/repository properties:');
        nullableIssues.forEach(issue => {
          console.error(`  ${issue.file}:${issue.line} - ${issue.description}`);
          console.error(`    ${issue.content}`);
        });
      }
      
      expect(nullableIssues).toEqual([]);
    });
    
    it('should not have any optional service/repository parameters', () => {
      const optionalIssues = allIssues.filter(
        issue => 
          issue.pattern.includes('Optional') &&
          (issue.content.includes('Service') || issue.content.includes('Repository'))
      );
      
      if (optionalIssues.length > 0) {
        console.error('\n❌ Found optional service/repository parameters:');
        optionalIssues.forEach(issue => {
          console.error(`  ${issue.file}:${issue.line} - ${issue.description}`);
          console.error(`    ${issue.content}`);
        });
      }
      
      expect(optionalIssues).toEqual([]);
    });
    
    it('should not have any lazy initialization assignments', () => {
      const lazyInitIssues = allIssues.filter(
        issue => issue.pattern.includes('coalescing')
      );
      
      if (lazyInitIssues.length > 0) {
        console.error('\n❌ Found lazy initialization assignments:');
        lazyInitIssues.forEach(issue => {
          console.error(`  ${issue.file}:${issue.line} - ${issue.description}`);
          console.error(`    ${issue.content}`);
        });
      }
      
      expect(lazyInitIssues).toEqual([]);
    });
    
    it('should not have any fallback cases', () => {
      const fallbackIssues = allIssues.filter(
        issue => issue.pattern.includes('Fallback')
      );
      
      if (fallbackIssues.length > 0) {
        console.error('\n❌ Found fallback cases:');
        fallbackIssues.forEach(issue => {
          console.error(`  ${issue.file}:${issue.line} - ${issue.description}`);
          console.error(`    ${issue.content}`);
        });
      }
      
      expect(fallbackIssues).toEqual([]);
    });
    
    it('should not have any null checks for services/repositories', () => {
      const nullCheckIssues = allIssues.filter(
        issue => 
          issue.pattern.includes('Null check') &&
          (issue.content.includes('Service') || issue.content.includes('Repository'))
      );
      
      if (nullCheckIssues.length > 0) {
        console.error('\n❌ Found null checks for services/repositories:');
        nullCheckIssues.forEach(issue => {
          console.error(`  ${issue.file}:${issue.line} - ${issue.description}`);
          console.error(`    ${issue.content}`);
        });
      }
      
      expect(nullCheckIssues).toEqual([]);
    });
  });
});


