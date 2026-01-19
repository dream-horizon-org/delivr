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