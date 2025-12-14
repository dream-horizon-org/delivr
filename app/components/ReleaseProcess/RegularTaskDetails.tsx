/**
 * RegularTaskDetails Component
 * Handles expanded content for non-build tasks
 * Includes: external links, task metadata, timestamps
 */

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import type { Task } from '~/types/release-process.types';
import { TaskStatus, TaskType } from '~/types/release-process-enums';
import { Anchor } from '@mantine/core';

interface RegularTaskDetailsProps {
  task: Task;
}

export function RegularTaskDetails({ task }: RegularTaskDetailsProps) {
  // Extract external links from externalData
  const branchUrl = task.externalData?.branchUrl as string | undefined;
  const ticketUrl = task.externalData?.ticketUrl as string | undefined;
  const runLink = task.externalData?.runLink as string | undefined;
  
  // Extract artifact links for successful build tasks (legacy support)
  const isFileBasedBuildTask = 
    task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS ||
    task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS;
  const hasCompletedBuild = 
    task.taskStatus === TaskStatus.COMPLETED && 
    isFileBasedBuildTask;
  
  // Artifact links can be stored as artifactPath, artifactUrl, or builds array
  const artifactPath = task.externalData?.artifactPath as string | undefined;
  const artifactUrl = task.externalData?.artifactUrl as string | undefined;
  const builds = task.externalData?.builds as Array<{ 
    artifactPath?: string; 
    artifactUrl?: string; 
    platform?: string;
    downloadUrl?: string;
  }> | undefined;
  
  // Collect all artifact links
  const artifactLinks: Array<{ url: string; platform?: string; label: string }> = [];
  
  if (hasCompletedBuild) {
    // Single artifact path/url (for single platform builds)
    const singleArtifactUrl = artifactUrl || artifactPath;
    if (singleArtifactUrl && (!builds || builds.length === 0)) {
      artifactLinks.push({ url: singleArtifactUrl, label: 'Download Artifact' });
    }
    
    // Multiple builds (for regression cycles with multiple platforms)
    if (builds && Array.isArray(builds) && builds.length > 0) {
      builds.forEach((build) => {
        const buildUrl = build.downloadUrl || build.artifactUrl || build.artifactPath;
        if (buildUrl) {
          const platformLabel = build.platform ? ` (${build.platform})` : '';
          artifactLinks.push({ 
            url: buildUrl, 
            platform: build.platform,
            label: `Download Artifact${platformLabel}` 
          });
        }
      });
    }
  }

  return (
    <Stack gap="md">
      {/* Task Details */}
      {task.externalId && (
        <Stack gap="xs">
          <Group gap="md">
            <div>
              <Text size="xs" c="dimmed">
                External ID
              </Text>
              <Text size="sm" fw={500}>
                {task.externalId}
              </Text>
            </div>
          </Group>
        </Stack>
      )}

      {/* External Links */}
      {(branchUrl || ticketUrl || runLink || artifactLinks.length > 0) && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Links
          </Text>
          <Group gap="md">
            {branchUrl && (
              <Anchor href={branchUrl} target="_blank" size="sm" c="brand">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">View Branch</Text>
                </Group>
              </Anchor>
            )}
            {ticketUrl && (
              <Anchor href={ticketUrl} target="_blank" size="sm" c="brand">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">View Ticket</Text>
                </Group>
              </Anchor>
            )}
            {runLink && (
              <Anchor href={runLink} target="_blank" size="sm" c="brand">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">View Test Run</Text>
                </Group>
              </Anchor>
            )}
            {artifactLinks.map((artifact, index) => (
              <Anchor 
                key={index} 
                href={artifact.url} 
                target="_blank" 
                size="sm" 
                c="brand"
                download
              >
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  <Text size="sm">{artifact.label}</Text>
                </Group>
              </Anchor>
            ))}
          </Group>
        </Stack>
      )}

      {/* Task Metadata */}
      {task.externalData && Object.keys(task.externalData).length > 0 && (
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>
            Additional Information
          </Text>
          <Paper p="sm" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="xs" className="font-mono" style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(task.externalData, null, 2)}
            </Text>
          </Paper>
        </Stack>
      )}

      {/* Timestamps */}
      <Group gap="md">
        {task.createdAt && (
          <div>
            <Text size="xs" c="dimmed">
              Created
            </Text>
            <Text size="xs">
              {new Date(task.createdAt).toLocaleString()}
            </Text>
          </div>
        )}
        {task.updatedAt && (
          <div>
            <Text size="xs" c="dimmed">
              Updated
            </Text>
            <Text size="xs">
              {new Date(task.updatedAt).toLocaleString()}
            </Text>
          </div>
        )}
      </Group>
    </Stack>
  );
}


