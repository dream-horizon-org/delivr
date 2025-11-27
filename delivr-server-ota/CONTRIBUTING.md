# Contributing to Delivr OTA server

Thank you for your interest in contributing to Delivr OTA server! This document provides guidelines and steps for contributing.

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:
- Docker Desktop (must be running)
- npm (Node Package Manager)
- Google OAuth configuration (optional)

### Local dev setup

1. Clone the repository:
```bash
git clone git@github.com:ds-horizon/delivr-server-ota.git
cd delivr-server-ota
cd api
```

3. Create a .env file and add required env variables(Refer to .env.example):
```bash
touch .env
```

3. Install pm2 package manager:
```bash
npm install pm2 -g
```

3. Install dependencies:
```bash
npm install
```

4. Build the project:
```bash
npm run build
```

4. Start the docker containers:
```bash
docker compose up
```
This starts all the required components on docker. Injects environment variables from the creeated `.env`. Starts the server on port mentioned in `.env`. 

## Development Workflow

1. Make your changes in the `api` directory (TypeScript source)
2. Build using `npm run build`

## Ways to Contribute

We welcome contributions in various forms, including but not limited to:

1. **Reporting Issues**: If you encounter bugs, or have feature suggestions, please:
   - Search existing Issues to check if the problem has already been reported.
   - If the issue is new, create a detailed GitHub Issue, including:
     - A clear and descriptive title.
     - Steps to reproduce (if applicable).
     - Expected and actual behavior.
     - Any relevant logs, screenshots, or configurations.

2. **Raise Pull Requests**: To contribute directly to the codebase:
   - Create a new branch, implement your changes, ensuring your code adheres to the project's standards.
   - Open a Pull Request to propose your changes, providing a detailed description of the update.
   - Update the documentation.
   - All PRs undergo review before merging. Engage constructively in discussions and incorporate feedback as needed.

## Need Help?

- Report issues on [GitHub Issues](https://github.com/ds-horizon/delivr-server-ota/issues)