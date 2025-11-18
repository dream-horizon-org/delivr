/**
 * Checkmate Rules Configuration Component
 * Configure validation rules for Checkmate test runs
 */

import { Card, Stack, Text, NumberInput, Switch, Group, Alert, Divider } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import type { CheckmateRules } from '~/types/release-config';

interface CheckmateRulesConfigProps {
  rules: CheckmateRules;
  onChange: (rules: CheckmateRules) => void;
}

export function CheckmateRulesConfig({
  rules,
  onChange,
}: CheckmateRulesConfigProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <div>
          <Text fw={600} size="md" className="mb-1">
            Checkmate Validation Rules
          </Text>
          <Text size="xs" c="dimmed">
            Define criteria that must be met before a release can proceed
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
          <Text size="sm">
            These rules determine when a release is ready to proceed based on Checkmate test run results.
          </Text>
        </Alert>

        <Divider />

        <Stack gap="sm">
          <Text size="sm" fw={500} className="mb-1">
            Test Run Thresholds
          </Text>
          
          <NumberInput
            label="Maximum Failed Tests"
            description="Number of failed tests allowed before blocking release (0 = no failures allowed)"
            value={rules.maxFailedTests}
            onChange={(val) => onChange({ ...rules, maxFailedTests: Number(val) })}
            min={0}
            max={100}
            required
          />

          <NumberInput
            label="Maximum Untested Cases"
            description="Number of untested cases allowed before blocking release (0 = all must be tested)"
            value={rules.maxUntestedCases}
            onChange={(val) => onChange({ ...rules, maxUntestedCases: Number(val) })}
            min={0}
            max={1000}
            required
          />
        </Stack>

        <Divider />

        <Stack gap="sm">
          <Text size="sm" fw={500} className="mb-1">
            Platform Requirements
          </Text>
          
          <Switch
            label="Require All Platforms to Pass"
            description="All selected platforms (Web, PlayStore, iOS) must pass validation"
            checked={rules.requireAllPlatforms}
            onChange={(e) => onChange({ ...rules, requireAllPlatforms: e.currentTarget.checked })}
          />

          {!rules.requireAllPlatforms && (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" className="mt-2">
              <Text size="xs">
                When disabled, release can proceed if any ONE platform passes, even if others fail.
              </Text>
            </Alert>
          )}
        </Stack>

        <Divider />

        <Stack gap="sm">
          <Text size="sm" fw={500} className="mb-1">
            Override Capability
          </Text>
          
          <Switch
            label="Allow Override"
            description="Users can manually override and proceed despite failed validation"
            checked={rules.allowOverride}
            onChange={(e) => onChange({ ...rules, allowOverride: e.currentTarget.checked })}
            color={rules.allowOverride ? 'orange' : 'gray'}
          />

          {rules.allowOverride && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light" className="mt-2">
              <Text size="xs" fw={500}>
                ⚠️ Security Note: Users will be able to proceed with releases even if tests fail. 
                Use this with caution and ensure proper approval workflows are in place.
              </Text>
            </Alert>
          )}
        </Stack>

        <Divider />

        <div className="bg-gray-50 rounded p-3">
          <Text size="xs" fw={600} c="dimmed" className="mb-2">
            CURRENT RULES SUMMARY:
          </Text>
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              • Failed tests: {rules.maxFailedTests === 0 ? 'None allowed' : `Max ${rules.maxFailedTests}`}
            </Text>
            <Text size="xs" c="dimmed">
              • Untested cases: {rules.maxUntestedCases === 0 ? 'All must be tested' : `Max ${rules.maxUntestedCases} untested`}
            </Text>
            <Text size="xs" c="dimmed">
              • Platform requirement: {rules.requireAllPlatforms ? 'All platforms must pass' : 'At least one platform must pass'}
            </Text>
            <Text size="xs" c="dimmed">
              • Override: {rules.allowOverride ? '✓ Enabled (users can proceed despite failures)' : '✗ Disabled (strict enforcement)'}
            </Text>
          </Stack>
        </div>
      </Stack>
    </Card>
  );
}

