# Contributing to Delivr CLI

Thank you for your interest in contributing to Delivr CLI! This document provides guidelines and steps for contributing.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/ds-horizon/delivr-cli.git
cd delivr-cli
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Development Workflow

1. Make your changes in the `script/` directory (TypeScript source)
2. Build using `npm run build`
3. Run linting before committing: `npm run lint`

## Building the bsdiff Binary

The project includes a native binary (`bsdiff43`) for creating patch updates:

1. Navigate to bsdiff directory:
```bash
cd bsdiff
```

2. Build the binary:
```bash
make clean && make
```

The binary will be used by the CLI for creating patch updates.

## Need Help?

- Report issues on [GitHub Issues](https://github.com/ds-horizon/delivr-cli/issues)
