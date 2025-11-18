/**
 * Jenkins Configuration Form Component
 * Captures Jenkins-specific build configuration
 */

import { useState } from 'react';
import { TextInput, Select, Stack, Button, Text, Group } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { JenkinsConfig } from '~/types/release-config';

interface JenkinsConfigFormProps {
  config: Partial<JenkinsConfig>;
  onChange: (config: Partial<JenkinsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
}

export function JenkinsConfigForm({
  config,
  onChange,
  availableIntegrations,
}: JenkinsConfigFormProps) {
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  
  const parameters = config.parameters || {};
  
  const handleAddParameter = () => {
    if (newParamKey && newParamValue) {
      onChange({
        ...config,
        parameters: {
          ...parameters,
          [newParamKey]: newParamValue,
        },
      });
      setNewParamKey('');
      setNewParamValue('');
    }
  };
  
  const handleRemoveParameter = (key: string) => {
    const newParams = { ...parameters };
    delete newParams[key];
    onChange({
      ...config,
      parameters: newParams,
    });
  };
  
  return (
    <Stack gap="md">
      <Select
        label="Jenkins Instance"
        placeholder="Select Jenkins instance"
        data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
        value={config.integrationId}
        onChange={(val) => onChange({ ...config, integrationId: val || '' })}
        required
        description="Choose the connected Jenkins instance"
      />
      
      <TextInput
        label="Job URL"
        placeholder="https://jenkins.company.com/job/android-build"
        value={config.jobUrl || ''}
        onChange={(e) => onChange({ ...config, jobUrl: e.target.value })}
        required
        description="Full URL to the Jenkins job"
      />
      
      <TextInput
        label="Job Name"
        placeholder="android-build"
        value={config.jobName || ''}
        onChange={(e) => onChange({ ...config, jobName: e.target.value })}
        required
        description="Jenkins job name"
      />
      
      <div>
        <Text size="sm" fw={500} className="mb-2">
          Job Parameters
        </Text>
        
        {Object.entries(parameters).length > 0 ? (
          <Stack gap="xs" className="mb-3">
            {Object.entries(parameters).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Text size="sm" fw={500}>
                    {key}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {value}
                  </Text>
                </div>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={() => handleRemoveParameter(key)}
                  leftSection={<IconTrash size={14} />}
                >
                  Remove
                </Button>
              </div>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" className="mb-3">
            No parameters added yet
          </Text>
        )}
        
        <div className="flex gap-2">
          <TextInput
            placeholder="Parameter name"
            value={newParamKey}
            onChange={(e) => setNewParamKey(e.target.value)}
            className="flex-1"
          />
          <TextInput
            placeholder="Parameter value"
            value={newParamValue}
            onChange={(e) => setNewParamValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddParameter}
            disabled={!newParamKey || !newParamValue}
          >
            Add
          </Button>
        </div>
      </div>
    </Stack>
  );
}

