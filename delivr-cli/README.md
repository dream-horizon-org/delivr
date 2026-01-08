# Delivr CLI

The **Delivr CLI** is a Node.js application that allows users to deploy and manage over-the-air updates for React Native applications.

## Installation & Usage

### Global Installation
```bash
npm install -g @d11/delivr-cli
```
After global installation, you can use the CLI directly:
```bash
code-push-standalone <command>
```

### Project Installation
```bash
# Using npm
npm install --save-dev @d11/delivr-cli

# Using yarn
yarn add --dev @d11/delivr-cli
```
After project installation, you can use the CLI through npm/yarn:
```bash
# Using npm
npm run code-push-standalone <command>

# Using yarn
yarn code-push-standalone <command>

# Using npx
npx code-push-standalone <command>
```

## Authentication

Most commands require authentication. You'll need an access key to use the CLI.

### Login
```bash
# Login with access key
code-push-standalone login --accessKey <your-access-key> <server-url>

# Check login status
code-push-standalone whoami

# Logout
code-push-standalone logout
```

To get an access key:

1. Visit [Delivr Dashboard](https://github.com/ds-horizon/delivr-web-panel)
2. Go to Settings → Generate New Token
3. Generate a new access key

## Release Management

The `release` command allows you to deploy updates to your app. There are two types of updates you can release:

1. Full Bundle (sending fully updated bundle)
2. Patch Bundle (sending only the diff)

### Command Structure
```bash
code-push-standalone release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--disabled <disabled>]
[--mandatory]
[--noDuplicateReleaseError]
[--rollout <rolloutPercentage>]
[--isPatch <true|false>] # Default false. Specify true in case sending patch bundle.
[--compression <'deflate' | 'brotli'>] # 'deflate' (default) or 'brotli' (better compression)
```

Parameters:

Required Parameters:
- `appName`: Name of your app (e.g., "MyApp-iOS")
- `updateContents`: Path to your update files (bundle/assets)
- `targetBinaryVersion`: App store version this update is for. Can be:
  - Exact version: "1.0.0"
  - Range: "^1.0.0" (compatible with 1.x.x)
  - Wildcard: "*" (all versions)

Optional Parameters:
- `--deploymentName` or `-d`: Target deployment ("Staging" or "Production", defaults to "Staging")
- `--description` or `-des`: Release notes or changelog
- `--disabled`: Prevents update from being downloaded (useful for staged rollouts)
- `--mandatory`: Forces users to accept this update
- `--noDuplicateReleaseError`: Shows warning instead of error if releasing same content
- `--rollout`: Percentage of users who should receive this update (1-100)
- `--isPatch`: Whether this is a patch update
  - `false` (default): Full bundle update
  - `true`: Patch update (requires patch bundle)
- `--compression`: Compression algorithm to use
  - `deflate` (default): Standard compression
  - `brotli`: Better compression, smaller bundle size

### Full Bundle Release
Release a complete new bundle:
```bash
# Release to staging with deflate compression (default)
code-push-standalone release MyApp-iOS ./codepush 1.0.0 \
  --deploymentName Staging \
  --description "New features" \
  --isPatch false

# Release with brotli compression (better compression)
code-push-standalone release MyApp-iOS ./dist/bundle "^1.0.0" \
  --deploymentName Production \
  --mandatory \
  --isPatch false \
  --compression brotli
```

> Note about compression: Brotli typically achieves better compression ratios than deflate (e.g., 23.1MB → 8.14MB with Brotli vs 11.04MB with deflate).

### Patch Bundle Release
For smaller updates, first create a patch and then release it:

1. Create patch between old and new bundles:
```bash
code-push-standalone create-patch \
  ./old-bundle \
  ./new-bundle \
  ./.codepush/patches
```

2. Release the patch:
```bash
# Release patch with brotli compression
code-push-standalone release MyApp-iOS ./.codeupush/patches "1.0.0" \
  --deploymentName Staging \
  --description "Bug fixes" \
  --isPatch true \
  --compression brotli
```

> Note about patches: Patch updates significantly reduce the update size as they only contain the changes between versions. Always use `--isPatch true` when releasing a patch bundle.

_Note: Make sure to upload assets alongwith patch bundle._

For more details about the binary diff implementation, see [bsdiff/README.md](./bsdiff/README.md).

### Promote Updates
After testing in staging, promote to production:
```bash
# Basic promotion
code-push-standalone promote MyApp-iOS Staging Production

# Promotion with options
code-push-standalone promote MyApp-iOS Staging Production \
  --rollout 25 \                    # Release to 25% of users
    --description "Verified update"    # Update description
```

## Contributing

For information about contributing to Delivr CLI, please see our [Contributing Guide](./CONTRIBUTING.md).

---
**Note:** For additional commands and advanced features, see our [Advanced Usage Guide](./CLI_REFERENCE.md).