import {
  Button,
  Group,
  Text,
  Progress,
  Alert,
  ActionIcon,
  Loader,
  Badge,
  Stack,
  rem,
} from "@mantine/core";
import { IconFolder, IconInfoCircle, IconX, IconCheck, IconDownload } from "@tabler/icons-react";
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

type DirectoryUploadState = 'idle' | 'selecting' | 'processing' | 'completed' | 'error';

interface DirectoryInfo {
  name: string;
  fileCount: number;
  files: FileList | null;
}

interface DirectoryUploadProps {
  onDirectorySelect: (zipBlob: Blob, directoryName: string) => void;
  onCancel?: () => void; // Optional callback when upload is cancelled
  resetTrigger?: number; // Increment this to trigger a reset
  disabled?: boolean;
  error?: string;
  hasSelectedDirectory?: boolean; // Whether parent has a directory selected
  selectedDirectoryName?: string; // Name of the selected directory from parent
}

export function DirectoryUpload({ onDirectorySelect, onCancel, resetTrigger, disabled = false, error, hasSelectedDirectory = false, selectedDirectoryName = "" }: DirectoryUploadProps) {
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef<boolean>(false);
  
  // Directory upload state
  const [directoryUploadState, setDirectoryUploadState] = useState<DirectoryUploadState>('idle');
  const [directoryInfo, setDirectoryInfo] = useState<DirectoryInfo | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null); // Store ZIP for download testing

  const createZipFromFiles = async (files: FileList): Promise<Blob | null> => {
    const zip = new JSZip();
    
    // Process each file and maintain directory structure
    for (let i = 0; i < files.length; i++) {
      // Check if operation was cancelled
      if (cancelledRef.current) {
        return null;
      }
      
      const file = files[i];
      // Use the webkitRelativePath to maintain directory structure
      const relativePath = file.webkitRelativePath || file.name;
      zip.file(relativePath, file);
      
      // Update progress only if not cancelled
      if (!cancelledRef.current) {
        const progress = Math.round(((i + 1) / files.length) * 50); // First 50% for adding files
        setProcessingProgress(progress);
      }
    }
    
    // Check if cancelled before ZIP generation
    if (cancelledRef.current) {
      return null;
    }
    
    // Generate ZIP with progress tracking
    const zipPromise = zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    }, (metadata) => {
      // Check if cancelled during ZIP generation
      if (cancelledRef.current) {
        return; // Stop progress updates but can't stop ZIP generation
      }
      
      // Second 50% for ZIP generation
      const progress = 50 + Math.round((metadata.percent || 0) * 0.5);
      setProcessingProgress(progress);
    });

    // Wait for ZIP generation to complete
    const result = await zipPromise;
    
    // Final check after ZIP generation completes
    if (cancelledRef.current) {
      console.log('ZIP generation completed but operation was cancelled - returning null');
      return null; // Return null to indicate cancellation
    }
    
    return result;
  };

  const handleDirectorySelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Reset cancellation flag for new upload
    cancelledRef.current = false;

    // Get directory name from the first file's path
    const firstFile = files[0];
    const pathParts = firstFile.webkitRelativePath?.split('/') || [firstFile.name];
    const directoryName = pathParts[0] || 'bundle';

    // Set directory info and start processing
    setDirectoryInfo({
      name: directoryName,
      fileCount: files.length,
      files: files
    });
    setDirectoryUploadState('processing');
    setProcessingProgress(0);

    try {
      // Create ZIP from files
      const zipBlob = await createZipFromFiles(files);
      
      // CRITICAL: Check cancellation immediately after async operation
      // This prevents race conditions where ZIP completes after cancellation
      if (cancelledRef.current) {
        console.log('Upload was cancelled during processing - callback prevented');
        return; // Exit early if cancelled - NO callback execution
      }
      
      // Additional safety check for null zipBlob (cancellation during ZIP creation)
      if (zipBlob === null) {
        console.log('ZIP creation returned null - callback prevented');
        return; // Exit early if ZIP creation was cancelled
      }
      
      // Update state to completed
      setDirectoryUploadState('completed');
      setProcessingProgress(100);
      
      // Store ZIP blob for download testing
      setZipBlob(zipBlob);
      
      // FINAL check before callback execution (paranoid but safe)
      if (cancelledRef.current) {
        console.log('Pre-callback cancellation check - callback prevented');
        return;
      }
      
      // Call the parent callback - only if we're absolutely sure it's not cancelled
      console.log('Executing callback - upload completed successfully');
      onDirectorySelect(zipBlob, directoryName);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      // Only set error state if not cancelled (cancelled operations shouldn't show errors)
      if (!cancelledRef.current) {
        setDirectoryUploadState('error');
      }
    }
  }, [onDirectorySelect]);

  // Reset function to clear all internal state
  const resetDirectoryUpload = useCallback(() => {
    // Reset cancellation flag
    cancelledRef.current = false;
    
    // Reset all state
    setDirectoryInfo(null);
    setDirectoryUploadState('idle');
    setProcessingProgress(0);
    setZipBlob(null);
    
    // Clear file input
    if (directoryInputRef.current) {
      directoryInputRef.current.value = '';
    }
    
    console.log('🔄 DirectoryUpload component state reset');
  }, []);

  const handleCancelDirectory = useCallback(() => {
    // Set cancellation flag to stop any ongoing processing
    cancelledRef.current = true;
    
    // Use shared reset function (but keep cancellation flag set)
    resetDirectoryUpload();
    cancelledRef.current = true; // Re-set cancellation flag after reset
    
    // Notify parent component to clear its state
    if (onCancel) {
      onCancel();
    }
  }, [onCancel, resetDirectoryUpload]);

  // Listen for reset trigger from parent
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetDirectoryUpload();
    }
  }, [resetTrigger, resetDirectoryUpload]);

  const handleDownloadZip = useCallback(() => {
    if (!zipBlob || !directoryInfo) return;
    
    // Create download URL
    const url = URL.createObjectURL(zipBlob);
    
    // Create temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${directoryInfo.name}-bundle.zip`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Cleanup
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }, [zipBlob, directoryInfo]);

  return (
    <Stack gap="sm">
      <Alert icon={<IconInfoCircle />} color="blue" variant="light" styles={{ message: { fontSize: '13px' } }}>
        <Text size="xs">
          <strong>Tip:</strong> For single bundle files, create a directory containing just your bundle file (e.g., a folder with <code>index.android.bundle</code> inside).
        </Text>
      </Alert>
      
      <div>
        
        {/* Directory Upload States - Only show button if nothing is selected */}
        {(directoryUploadState === 'idle' && !directoryInfo && !hasSelectedDirectory) && (
          <div style={{ position: 'relative' }}>
            <input
              ref={directoryInputRef}
              type="file"
              webkitdirectory=""
              multiple
              required
              onChange={handleDirectorySelect}
              disabled={disabled}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            <Button
              variant="outline"
              leftSection={<IconFolder style={{ width: rem(16), height: rem(16) }} />}
              disabled={disabled}
              style={{ 
                width: '100%', 
                pointerEvents: 'none',
                borderColor: error ? 'var(--mantine-color-red-5)' : undefined
              }}
            >
              Choose Directory...
            </Button>
          </div>
        )}

        {/* Show consistent completed UI when parent has selected directory but component is idle */}
        {(directoryUploadState === 'idle' && !directoryInfo && hasSelectedDirectory) && (
          <div>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <IconCheck style={{ width: rem(20), height: rem(20), color: 'var(--mantine-color-green-6)' }} />
                <div>
                  <Text size="sm" fw={500}>{selectedDirectoryName}</Text>
                </div>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={handleCancelDirectory}
                  title="Remove directory"
                >
                  <IconX style={{ width: rem(16), height: rem(16) }} />
                </ActionIcon>
              </Group>
            </Group>
          </div>
        )}

        {/* Processing State */}
        {directoryUploadState === 'processing' && directoryInfo && (
          <div>
            <Group justify="space-between" mb="xs">
              <Group gap="sm">
                <Loader size="sm" />
                <div>
                  <Text size="sm" fw={500}>{directoryInfo.name}</Text>
                  <Text size="xs" c="dimmed">Processing {directoryInfo.fileCount} files...</Text>
                </div>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={handleCancelDirectory}
                title="Cancel directory upload"
              >
                <IconX style={{ width: rem(16), height: rem(16) }} />
              </ActionIcon>
            </Group>
            <Progress value={processingProgress} animated />
          </div>
        )}

        {/* Completed State */}
        {directoryUploadState === 'completed' && directoryInfo && (
          <div>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <IconCheck style={{ width: rem(20), height: rem(20), color: 'var(--mantine-color-green-6)' }} />
                <div>
                  <Text size="sm" fw={500}>{directoryInfo.name}</Text>
                  <Badge size="xs" color="green" variant="light">
                    {directoryInfo.fileCount} files ready
                  </Badge>
                </div>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="subtle"
                  color="blue"
                  onClick={handleDownloadZip}
                  title="Download ZIP for testing"
                >
                  <IconDownload style={{ width: rem(16), height: rem(16) }} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={handleCancelDirectory}
                  title="Remove directory"
                >
                  <IconX style={{ width: rem(16), height: rem(16) }} />
                </ActionIcon>
              </Group>
            </Group>
          </div>
        )}

        {/* Error State */}
        {directoryUploadState === 'error' && (
          <div>
            <Alert color="red" variant="light" mb="sm">
              <Text size="sm">Failed to process directory. Please try again.</Text>
            </Alert>
            <Button
              variant="outline"
              leftSection={<IconFolder style={{ width: rem(16), height: rem(16) }} />}
              onClick={handleCancelDirectory}
              style={{ width: '100%' }}
            >
              Choose Different Directory
            </Button>
          </div>
        )}
        
        {error && (directoryUploadState === 'idle' || !directoryInfo) && (
          <Text size="xs" c="red" mt={5}>
            {error}
          </Text>
        )}
      </div>
    </Stack>
  );
}
