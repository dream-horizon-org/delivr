/**
 * CLI (Command Line Interface) Constants
 * Version requirements and CLI-related configuration
 */

/**
 * Minimum CLI version that requires tenant header for multi-tenant support
 * 
 * Versions >= 0.0.6 must provide tenant header when resolving apps by name.
 * This ensures proper tenant isolation in multi-tenant environments.
 * 
 * @since 0.0.6 - Tenant header became mandatory for app resolution
 */
export const MIN_CLI_VERSION_REQUIRING_TENANT = '0.0.6' as const;

/**
 * CLI version header name
 * Used to detect which CLI version is making the request
 */
export const CLI_VERSION_HEADER = 'X-CodePush-CLI-Version' as const;

