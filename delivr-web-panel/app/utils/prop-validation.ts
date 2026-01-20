/**
 * Prop Validation Utilities
 * Runtime validation for component props to catch errors early
 */

/**
 * Validates that required stage component props are provided
 * Throws an error if validation fails (in development mode)
 * 
 * @param props - Props object to validate
 * @param componentName - Name of the component for error messages
 * @throws Error if validation fails
 */
export function validateStageProps(
  props: {
    tenantId?: string;
    releaseId?: string;
  },
  componentName: string
): asserts props is { tenantId: string; releaseId: string } {
  if (!props.tenantId) {
    const error = new Error(
      `${componentName}: tenantId is required but was not provided`
    );
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      throw error;
    }
    // In production, log but don't throw to prevent app crashes
    console.error(error);
  }

  if (!props.releaseId) {
    const error = new Error(
      `${componentName}: releaseId is required but was not provided`
    );
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      throw error;
    }
    // In production, log but don't throw to prevent app crashes
    console.error(error);
  }
}

