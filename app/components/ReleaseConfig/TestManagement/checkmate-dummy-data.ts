/**
 * ⚠️ TEMPORARY DUMMY DATA FILE ⚠️
 * 
 * This file contains dummy/mock data for Checkmate integration.
 * Used for frontend development without calling backend APIs.
 * 
 * 📌 IMPORTANT: Platforms (Android/iOS) are NOT in this file!
 *    Platforms are global system constants, NOT Checkmate metadata.
 * 
 * This file only contains:
 * - Projects (from Checkmate)
 * - Sections (project-specific)
 * - Labels (project-specific)
 * - Squads (project-specific)
 * 
 * 🗑️ DELETE THIS FILE when backend API is ready!
 * 
 * Related files to update when deleting:
 * - CheckmateConfigFormEnhanced.tsx (restore API calls)
 */

// ============================================================================
// TYPE DEFINITIONS (matching frontend interfaces)
// ============================================================================

interface CheckmateProject {
  id: number;
  name: string;
  description?: string;
}

interface CheckmateSection {
  id: number;
  name: string;
  projectId: number;
}

interface CheckmateLabel {
  id: number;
  name: string;
  projectId: number;
}

interface CheckmateSquad {
  id: number;
  name: string;
  projectId: number;
}

// ============================================================================
// DUMMY DATA GENERATORS
// ============================================================================

/**
 * Get dummy Checkmate projects
 * Simulates: GET /api/v1/integrations/:integrationId/metadata/projects
 */
export async function getDummyCheckmateProjects(
  integrationId: string
): Promise<{ success: boolean; data: { data: CheckmateProject[] } }> {
  console.log('[Checkmate Dummy] 🔧 Fetching dummy projects');
  console.log('[Checkmate Dummy] Integration ID (not used):', integrationId);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const dummyProjects: CheckmateProject[] = [
    {
      id: 101,
      name: 'Mobile App - iOS',
      description: 'iOS mobile application testing project',
    },
    {
      id: 102,
      name: 'Mobile App - Android',
      description: 'Android mobile application testing project',
    },
    {
      id: 103,
      name: 'Web Application',
      description: 'Web application regression and smoke tests',
    },
    {
      id: 104,
      name: 'API Integration Tests',
      description: 'Backend API integration and contract testing',
    },
    {
      id: 105,
      name: 'E2E Test Suite',
      description: 'End-to-end user journey testing across all platforms',
    },
  ];

  console.log('[Checkmate Dummy] ✅ Returning', dummyProjects.length, 'projects');

  return {
    success: true,
    data: {
      data: dummyProjects,
    },
  };
}

/**
 * Get dummy Checkmate metadata (sections, labels, squads)
 * Simulates parallel API calls:
 * - GET /api/v1/integrations/:integrationId/metadata/sections?projectId=X
 * - GET /api/v1/integrations/:integrationId/metadata/labels?projectId=X
 * - GET /api/v1/integrations/:integrationId/metadata/squads?projectId=X
 */
export async function getDummyCheckmateMetadata(
  integrationId: string,
  projectId: number
): Promise<{
  sections: { success: boolean; data: { data: CheckmateSection[] } };
  labels: { success: boolean; data: { data: CheckmateLabel[] } };
  squads: { success: boolean; data: { data: CheckmateSquad[] } };
}> {
  console.log('[Checkmate Dummy] 🔧 Fetching dummy metadata');
  console.log('[Checkmate Dummy] Integration ID (not used):', integrationId);
  console.log('[Checkmate Dummy] Project ID:', projectId);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Dummy sections
  const dummySections: CheckmateSection[] = [
    {
      id: 1,
      name: 'Regression Tests',
      projectId: projectId,
    },
    {
      id: 2,
      name: 'Smoke Tests',
      projectId: projectId,
    },
    {
      id: 3,
      name: 'Integration Tests',
      projectId: projectId,
    },
    {
      id: 4,
      name: 'UI Tests',
      projectId: projectId,
    },
    {
      id: 5,
      name: 'API Tests',
      projectId: projectId,
    },
    {
      id: 6,
      name: 'E2E Tests',
      projectId: projectId,
    },
    {
      id: 7,
      name: 'Performance Tests',
      projectId: projectId,
    },
  ];

  // Dummy labels
  const dummyLabels: CheckmateLabel[] = [
    {
      id: 10,
      name: 'Critical',
      projectId: projectId,
    },
    {
      id: 11,
      name: 'High Priority',
      projectId: projectId,
    },
    {
      id: 12,
      name: 'Medium Priority',
      projectId: projectId,
    },
    {
      id: 13,
      name: 'Low Priority',
      projectId: projectId,
    },
    {
      id: 14,
      name: 'Bug Fix',
      projectId: projectId,
    },
    {
      id: 15,
      name: 'Feature',
      projectId: projectId,
    },
    {
      id: 16,
      name: 'Performance',
      projectId: projectId,
    },
    {
      id: 17,
      name: 'Security',
      projectId: projectId,
    },
    {
      id: 18,
      name: 'Accessibility',
      projectId: projectId,
    },
  ];

  // Dummy squads
  const dummySquads: CheckmateSquad[] = [
    {
      id: 1,
      name: 'Core Team',
      projectId: projectId,
    },
    {
      id: 2,
      name: 'Frontend Team',
      projectId: projectId,
    },
    {
      id: 3,
      name: 'Backend Team',
      projectId: projectId,
    },
    {
      id: 4,
      name: 'Mobile Team',
      projectId: projectId,
    },
    {
      id: 5,
      name: 'iOS Team',
      projectId: projectId,
    },
    {
      id: 6,
      name: 'Android Team',
      projectId: projectId,
    },
    {
      id: 7,
      name: 'QA Team',
      projectId: projectId,
    },
    {
      id: 8,
      name: 'DevOps Team',
      projectId: projectId,
    },
    {
      id: 9,
      name: 'Platform Team',
      projectId: projectId,
    },
  ];

  console.log('[Checkmate Dummy] ✅ Returning metadata:');
  console.log(`  - Sections: ${dummySections.length}`);
  console.log(`  - Labels: ${dummyLabels.length}`);
  console.log(`  - Squads: ${dummySquads.length}`);

  return {
    sections: {
      success: true,
      data: {
        data: dummySections,
      },
    },
    labels: {
      success: true,
      data: {
        data: dummyLabels,
      },
    },
    squads: {
      success: true,
      data: {
        data: dummySquads,
      },
    },
  };
}

// ============================================================================
// BACKEND DATA FORMAT REFERENCE
// ============================================================================
// 
// For reference when implementing real API:
// 
// Backend CheckmateProject type (from backend):
// {
//   projectId: number;
//   projectName: string;
//   projectDescription: string | null;
//   orgId: number;
//   createdByName: string | null;
//   createdOn: number;
// }
//
// Backend CheckmateSection type:
// {
//   sectionId: number;
//   sectionName: string;
//   projectId: number;
//   parentSectionId: number | null;
//   sectionDepth: number;
//   createdOn: string;
//   createdBy: number | null;
//   updatedOn: string;
//   updatedBy: number | null;
// }
//
// Backend CheckmateLabel type:
// {
//   labelId: number;
//   labelName: string;
//   labelType: 'System' | 'Custom';
//   projectId: number;
//   createdOn: string | null;
//   createdBy: number | null;
//   updatedOn: string;
//   updatedBy: number | null;
// }
//
// Backend CheckmateSquad type:
// {
//   squadId: number;
//   squadName: string;
//   projectId: number;
//   createdOn: string | null;
//   createdBy: number | null;
// }
//
// Note: Backend uses different field names (projectId vs id, projectName vs name)
// The BFF layer should transform these to match frontend expectations.
// ============================================================================

