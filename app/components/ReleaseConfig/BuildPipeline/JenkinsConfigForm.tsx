/**
 * Jenkins Configuration Form Component
 * Captures Jenkins-specific build configuration with dynamic parameter fetching
 */

import { useState, useEffect } from 'react';
import { TextInput, Select, Stack, Button, Text, Group, Alert, LoadingOverlay, Card, Badge } from '@mantine/core';
import { IconPlus, IconTrash, IconRefresh, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import type { JenkinsConfig } from '~/types/release-config';
import type { JenkinsConfigFormProps } from '~/types/release-config-props';
import type { JobParameter } from '~/.server/services/ReleaseManagement/integrations';
import { FIELD_LABELS, PLACEHOLDERS, BUTTON_LABELS } from '~/constants/release-config-ui';

export function JenkinsConfigForm({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: JenkinsConfigFormProps) {
  
  // Manual parameter entry state (legacy fallback)
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  
  // Parameter fetching state
  const [fetchingParams, setFetchingParams] = useState(false);
  const [parametersFetched, setParametersFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedParameters, setFetchedParameters] = useState<JobParameter[]>([]);
  
  const parameters = config.parameters || {};
  
  // Auto-select integration if only one exists
  useEffect(() => {
    if (availableIntegrations.length === 1 && !config.integrationId) {
      onChange({
        ...config,
        integrationId: availableIntegrations[0].id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableIntegrations.length, availableIntegrations[0]?.id]);
  
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
  
  // Fetch job parameters from Jenkins
  const handleFetchParameters = async () => {
    if (!config.jobUrl?.trim()) {
      setFetchError('Please enter a job URL first');
      return;
    }
    
    if (!tenantId) {
      setFetchError('No tenant ID provided');
      return;
    }
    
    setFetchingParams(true);
    setFetchError(null);
    
    if (!config.integrationId) {
      setFetchError('Please select a Jenkins integration first');
      setFetchingParams(false);
      return;
    }
    
    try {
      const result = await apiPost<{ parameters: JobParameter[] }>(
        `/api/v1/tenants/${tenantId}/workflows/job-parameters`,
        {
          providerType: 'JENKINS',
          integrationId: config.integrationId,
          url: config.jobUrl,
        }
      );
      
      if (result.success && result.data?.parameters) {
        setFetchedParameters(result.data.parameters);
        
        // Initialize parameter values with defaults or existing values
        const newParams: Record<string, string> = {};
        result.data.parameters.forEach((param: JobParameter) => {
          newParams[param.name] = 
            parameters[param.name] || 
            param.defaultValue?.toString() || 
            param.default?.toString() || 
            '';
        });
        
        onChange({
          ...config,
          parameters: newParams,
        });
        
        setParametersFetched(true);
      } else {
        setFetchError('Failed to fetch parameters');
      }
    } catch (error) {
      setFetchError(getApiErrorMessage(error, 'Failed to fetch parameters'));
    } finally {
      setFetchingParams(false);
    }
  };
  
  const handleParameterValueChange = (paramName: string, value: string) => {
    onChange({
      ...config,
      parameters: {
        ...parameters,
        [paramName]: value,
      },
    });
  };
  
  return (
    <div className="relative">
      <LoadingOverlay visible={fetchingParams} />
      
      <Stack gap="md">
      {/* Only show integration selector if multiple integrations exist */}
      {availableIntegrations.length > 1 && (
        <Select
          label="Jenkins Instance"
          placeholder="Select Jenkins instance"
          data={availableIntegrations.map(i => ({ value: i.id, label: i.displayName || i.name }))}
          value={config.integrationId}
          onChange={(val) => onChange({ ...config, integrationId: val || '' })}
          required
          description="Choose the connected Jenkins instance"
        />
      )}
      
      {/* Show integration name if only one exists */}
      {availableIntegrations.length === 1 && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Jenkins Instance:</span> {availableIntegrations[0].displayName || availableIntegrations[0].name}
        </div>
      )}
      
      <TextInput
        label="Job URL"
        placeholder="https://jenkins.company.com/job/android-build"
        value={config.jobUrl || ''}
        onChange={(e) => onChange({ ...config, jobUrl: e.target.value })}
        required
        description="Full URL to the Jenkins job"
      />
      
      {/* Fetch Parameters Button */}
      <div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleFetchParameters}
          loading={fetchingParams}
          disabled={!config.jobUrl?.trim()}
          variant="light"
          fullWidth
        >
          Fetch Job Parameters
        </Button>
        
        {fetchError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" className="mt-2">
            {fetchError}
          </Alert>
        )}
        
        {parametersFetched && (
          <Alert icon={<IconCheck size={16} />} color="green" className="mt-2">
            Successfully fetched {fetchedParameters.length} parameter(s)
          </Alert>
        )}
      </div>
      
      {/* Fetched Parameters (Dynamic) */}
      {parametersFetched && fetchedParameters.length > 0 && (
        <div>
          <Text size="sm" fw={500} className="mb-2">
            Job Parameters
          </Text>
          
          <Stack gap="sm">
            {fetchedParameters.map((param) => (
              <Card key={param.name} withBorder className="bg-gray-50">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>
                      {param.name}
                    </Text>
                    {param.required && (
                      <Badge size="xs" color="red">
                        Required
                      </Badge>
                    )}
                    <Badge size="xs" color="gray">
                      {param.type}
                    </Badge>
                  </Group>
                  
                  {param.description && (
                    <Text size="xs" c="dimmed">
                      {param.description}
                    </Text>
                  )}
                  
                  {param.choices && param.choices.length > 0 ? (
                    <Select
                      placeholder="Select a value"
                      data={param.choices.map((choice) => ({
                        value: choice,
                        label: choice,
                      }))}
                      value={parameters[param.name] || ''}
                      onChange={(val) => handleParameterValueChange(param.name, val || '')}
                    />
                  ) : (
                    <TextInput
                      placeholder={`Enter ${param.name}`}
                      value={parameters[param.name] || ''}
                      onChange={(e) => handleParameterValueChange(param.name, e.target.value)}
                    />
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </div>
      )}
      
      {/* Manual Parameter Entry (Fallback) */}
      {!parametersFetched && (
        <div>
          <Text size="sm" fw={500} className="mb-2">
            Job Parameters (Manual)
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
              No parameters added yet. Use "Fetch Job Parameters" or add manually.
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
      )}
      </Stack>
    </div>
  );
}

