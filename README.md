# Delivr

**Mobile DevOps Platform · Self-Hosted · Open Source**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.txt)

[delivr.live](https://delivr.live)

---

## What is Delivr?

A distribution platform that simplifies how teams build, test, and release mobile apps through automated operations, integration with multiple channels and distribution analytics.

**Platform Architecture:**

```
┌─────────────────────────────────────────────────┐
│         Delivr Mobile DevOps Platform          │
├─────────────────────────────────────────────────┤
│  Build Orchestration  │  Release Management    │
│   (Coming Soon)       │   (Coming Soon)        │
│   Any Mobile App      │   Any Mobile App       │
├─────────────────────────────────────────────────┤
│      Over-the-Air Updates (Available Now)      │
│            React Native                         │
└─────────────────────────────────────────────────┘
```

**Available Now:**
- **Over-the-Air Updates** for React Native apps - Deploy JavaScript and asset updates instantly without app store approval

**Coming Soon:**
- **Build Orchestration** for all mobile apps - Automated builds for iOS and Android
- **Release Management** for all mobile apps - Coordinate store and OTA releases with approval workflows

---

## Why Delivr?

**🚀 Accelerated Velocity**
- Deploy updates in minutes instead of days
- Iterate rapidly without app store bottlenecks
- Ship fixes immediately when they matter most

**🏗️ Full Control**
- Self-host on your infrastructure
- Complete data ownership
- No third-party processing

**🔌 Flexible & Extensible**
- Plugin architecture for storage, database, auth
- Open source and customizable
- API-first design

**📊 Unified Platform**
- Single dashboard for updates (now) + builds & releases (soon)
- Consistent experience across teams
- Reduced tool sprawl

**🔒 Security & Compliance**
- Self-hosted means your data stays yours
- Code signing for verified updates
- Audit trails and access control

**⚡ Battle-Tested**
- Production-proven in high-scale environments
- Handles high request volumes with proper infrastructure
- Designed for large user bases

---

## Quick Start

**Prerequisites:** Docker Desktop (running), Node.js 18+

```bash
# 1. Clone this monorepo
git clone https://github.com/ds-horizon/delivr.git
cd delivr

# 2. Launch all services
chmod +x launch_script.sh
./launch_script.sh
```

The script will guide you through:
- ✅ Environment setup and validation
- ✅ Port conflict resolution
- ✅ Starting all services (API, Dashboard, Database, Cache)

**Access:**
- Dashboard: http://localhost:3000
- API Server: http://localhost:3010

**→ Complete setup guide:** [delivr.live/dota/full-setup](https://delivr.live/dota/full-setup)

---

## What's Available

### ✅ Production Ready (Available Now)

**Pillar 1: Over-the-Air Updates**
- ✅ **Instant Deployment** - Push JS/asset updates in minutes, not days
- ✅ **Delta Patching** - Significantly smaller downloads with binary diffs
- ✅ **Staged Rollouts** - Gradual releases with percentage control
- ✅ **Mandatory Updates** - Force critical fixes immediately
- ✅ **Automatic Rollback** - SDK auto-reverts crashes
- ✅ **Version Targeting** - Deploy to specific app versions (semver)
- ✅ **Multi-Deployment** - Separate staging and production environments
- ✅ **Code Signing** - Cryptographic verification of updates
- ✅ **Brotli Compression** - Additional size reduction on bundles
- ✅ **Base Bytecode Optimization** - Hermes bytecode for smaller patches

**Web Dashboard**
- ✅ **App Management** - Create and manage multiple apps
- ✅ **Deployment Control** - Manage staging and production deployments
- ✅ **Release History** - Track all deployed versions
- ✅ **Real-Time Analytics** - Monitor adoption, versions, and errors
- ✅ **Rollout Control** - Adjust rollout percentages on the fly
- ✅ **OAuth Authentication** - Google, GitHub, Microsoft login

**CLI Tool**
- ✅ **Automated Releases** - CI/CD-friendly deployment commands
- ✅ **Binary Patching** - Create efficient patch bundles
- ✅ **Release Management** - Promote, rollback, and clear releases
- ✅ **Debug Tools** - Troubleshoot deployments and SDK integration
- ✅ **Code Signing** - Sign releases for security

**Infrastructure & Platform**
- ✅ **Self-Hosted** - Deploy on your infrastructure
- ✅ **Plugin System** - Pluggable storage (S3/Azure/Local), database (MySQL/Postgres), auth
- ✅ **Multi-Cloud** - AWS, Azure, or on-premises deployment
- ✅ **Docker-First** - Complete Docker Compose setup included
- ✅ **CDN Support** - CloudFront and Azure CDN integration
- ✅ **Caching** - Multi-layer Redis and Memcached
- ✅ **Health Checks** - Monitoring and status endpoints
- ✅ **Battle-Tested** - Production-proven at scale
- ✅ **API Versioning** - Legacy and modern API support

### 🔜 In Development (Coming Soon)

**Pillar 2: Release Management**
- 🔜 **Approval Workflows** - Multi-stage approval gates for release governance
- 🔜 **Release Coordination** - Sync App Store, Play Store, and OTA releases
- 🔜 **Release Trains** - Scheduled, predictable release cycles
- 🔜 **Automated Guardrails** - Auto-rollback on error thresholds
- 🔜 **Store Integration** - Track App Store and Play Store submission status

**Pillar 3: Build Orchestration**
- 🔜 **Git Integration** - Webhook-triggered builds from repository
- 🔜 **Multi-Platform Builds** - iOS and Android from single source
- 🔜 **Real-Time Logs** - Stream build logs to dashboard
- 🔜 **Artifact Management** - Store and manage build artifacts
- 🔜 **CI/CD Integration** - Jenkins, CircleCI, GitHub Actions support

**Platform Enhancements**
- 🔜 **GCP Deployment** - Google Cloud Platform support
- 🔜 **Expo Plugin** - First-class Expo integration
- 🔜 **Device Testing** - Cloud-based device farms for QA
- 🔜 **Advanced Analytics** - Enhanced insights and metrics

---

## Use Cases

**OTA Updates for React Native (Available Now):**
- **Instant Bug Fixes** - Deploy critical fixes without app store review
- **Security Patches** - Patch vulnerabilities immediately
- **Feature Flags** - Enable/disable features remotely
- **A/B Testing** - Test variants with different user segments
- **Regional Rollouts** - Launch features in specific regions first
- **Rapid Iteration** - Deploy updates multiple times per day

**Build & Release for All Mobile Apps (Coming Soon):**
- **Automated Build Pipelines** - Git push triggers iOS and Android builds
- **Coordinated Releases** - Sync App Store and Play Store submissions
- **Release Management** - Multi-stage approvals and automated guardrails
- **Works with any framework** - Native, React Native, Flutter, Ionic, etc.

---

## How OTA Updates Work

**For React Native apps:**

```
1. App Release
   React Native app with Delivr SDK → Published to App Store/Play Store

2. Update Creation
   Developer creates update → Via Web Dashboard or CLI

3. Bundle Storage
   Update bundle stored → Your infrastructure (S3, Azure Blob, etc.)

4. Update Check
   Mobile app checks for updates → Delivr Backend API

5. Download & Apply
   SDK downloads and applies → JavaScript/asset updates instantly
```

**What Can Be Updated via OTA?**

✅ **No Store Review Required:**
- JavaScript & TypeScript code
- React components and UI
- Images and assets
- JSON configuration
- Styling and themes

❌ **Requires App Store Submission:**
- Native code (Swift, Java, Kotlin, Objective-C)
- Native modules and dependencies
- App permissions
- App icons and launch screens

[Complete list of supported components](delivr-sdk-ota/docs/supported-components.md)

**Future Expansion:** Build Orchestration and Release Management will support all mobile apps (iOS and Android) regardless of framework - native apps, React Native, Flutter, Ionic, or any other framework.

---

## Monorepo Structure

This repository contains all Delivr components:

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| **[delivr-server-ota/](delivr-server-ota/)** | Backend API server for OTA updates & orchestration | [README](delivr-server-ota/README.md) · [Setup](delivr-server-ota/docs/DEV_SETUP.md) · [Architecture](delivr-server-ota/docs/ARCHITECTURE.md) |
| **[delivr-sdk-ota/](delivr-sdk-ota/)** | React Native SDK for OTA updates | [README](delivr-sdk-ota/README.md) · [iOS Setup](delivr-sdk-ota/docs/setup-ios.md) · [Android Setup](delivr-sdk-ota/docs/setup-android.md) · [API](delivr-sdk-ota/docs/api-js.md) |
| **[delivr-web-panel/](delivr-web-panel/)** | Web dashboard for managing apps, deployments, and releases | [README](delivr-web-panel/README.md) |
| **[delivr-cli/](delivr-cli/)** | CLI for release management and deployments | [README](delivr-cli/README.md) · [CLI Reference](delivr-cli/CLI_REFERENCE.md) · [bsdiff](delivr-cli/bsdiff/README.md) |

---

## Deployment Options

| Environment | Storage | Database | Guide |
|-------------|---------|----------|-------|
| **Local Dev** | LocalStack | MySQL | [Complete Setup Guide](https://delivr.live/dota/full-setup) |
| **AWS** | S3 | RDS | [Server Setup Guide](delivr-server-ota/docs/DEV_SETUP.md) |
| **Azure** | Blob Storage | Azure SQL | [Server Setup Guide](delivr-server-ota/docs/DEV_SETUP.md) |
| **On-Premises** | NFS/Local | MySQL/Postgres | [Server Setup Guide](delivr-server-ota/docs/DEV_SETUP.md) |

---

## App Store Compliance

✅ **OTA updates comply with Apple and Google guidelines:**

**Requirements:**
- JavaScript and assets only (no native code)
- Cannot change app's primary purpose
- Updates must be transparent to users

**Full compliance guide:** [Store Guidelines](delivr-sdk-ota/docs/store-guidelines.md)

---

## Performance

**OTA Updates:**
- Update checks are fast with multi-layer caching
- Download times depend on patch size and network conditions
- Patch application is near-instantaneous

**Efficiency:**
- Delta patches significantly reduce download sizes
- Brotli compression provides additional size reduction
- Typical result: Small patch bundles for incremental updates

**Scale:**
- Battle-tested in production environments
- Handles high request volumes with proper infrastructure
- Multi-region CDN distribution supported

---

## Documentation

### Getting Started

- **[Complete Setup Guide](https://delivr.live/dota/full-setup)** - End-to-end setup from installation to first deployment

### SDK Integration

- [Delivr SDK Overview](delivr-sdk-ota/README.md)
- [iOS Setup Guide](delivr-sdk-ota/docs/setup-ios.md)
- [Android Setup Guide](delivr-sdk-ota/docs/setup-android.md)
- [JavaScript API Reference](delivr-sdk-ota/docs/api-js.md)
- [How OTA Updates Work](delivr-sdk-ota/docs/ota-updates.md)
- [Multi-Deployment Testing](delivr-sdk-ota/docs/multi-deployment-testing.md)
- [Store Guidelines](delivr-sdk-ota/docs/store-guidelines.md)

### CLI Usage

- [CLI Overview](delivr-cli/README.md)
- [CLI Command Reference](delivr-cli/CLI_REFERENCE.md)
- [Binary Patching (bsdiff)](delivr-cli/bsdiff/README.md)

### Server & Infrastructure

- [Server Overview](delivr-server-ota/README.md)
- [Development Setup](delivr-server-ota/docs/DEV_SETUP.md)
- [Environment Configuration](delivr-server-ota/api/ENVIRONMENT.md)
- [Architecture Details](delivr-server-ota/docs/ARCHITECTURE.md)

### Web Dashboard

- [Web Panel Overview](delivr-web-panel/README.md)

---

## Community & Support

- **GitHub Issues** → [Report bugs & request features](https://github.com/ds-horizon/delivr/issues)
- **GitHub Discussions** → [Ask questions](https://github.com/ds-horizon/delivr/discussions)
- **Website** → [delivr.live](https://delivr.live)

---

## Contributing

We welcome contributions! Each component has its own contributing guide:

- [CLI Contributing](delivr-cli/CONTRIBUTING.md)
- [SDK Contributing](delivr-sdk-ota/CONTRIBUTING.md)
- [Server Contributing](delivr-server-ota/CONTRIBUTING.md)

---

## License

MIT License - see [LICENSE.txt](delivr-server-ota/LICENSE.txt)

---

## Security

Report security vulnerabilities: [SECURITY.md](delivr-sdk-ota/SECURITY.md)

---

**Made with ❤️ by [Horizon](https://github.com/ds-horizon)**

**[Get Started](https://delivr.live/dota/full-setup)** · **[Documentation](https://delivr.live)**

