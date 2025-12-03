# Encryption Setup for App Distribution Credentials

## Overview
Sensitive credentials (like private keys) are encrypted on the frontend before being sent to the backend. This ensures secure transmission of sensitive data.

## How It Works

### Frontend (delivr-web-panel-managed)
1. User enters `privateKeyPem` in the form
2. Frontend encrypts it using AES-256-GCM with `VITE_ENCRYPTION_KEY`
3. Encrypted string is sent to backend

### Backend (delivr-server-ota-managed)
1. Receives encrypted `privateKeyPem`
2. Decrypts using `ENCRYPTION_KEY` (must match frontend key)
3. Uses decrypted PEM key to generate JWT token
4. Verifies with App Store Connect API

## Setup Instructions

### 1. Ensure Encryption Keys Match

**Frontend `.env`:**
```bash
VITE_ENCRYPTION_KEY=K8vN2pQ5sT7wY0zB3dF6hJ9mP1rU4xA7cE0gI3lN6oQ=
```

**Backend `.env` or Docker environment:**
```bash
ENCRYPTION_KEY=K8vN2pQ5sT7wY0zB3dF6hJ9mP1rU4xA7cE0gI3lN6oQ=
```

**IMPORTANT:** Both values must be identical!

### 2. Verify Setup

Check frontend has the key:
```bash
cd delivr-web-panel-managed
grep VITE_ENCRYPTION_KEY .env
```

Check backend has the key:
```bash
cd delivr-server-ota-managed
docker exec api-app-1 env | grep ENCRYPTION_KEY
```

### 3. Generate New Key (if needed)

```bash
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('base64'));"
```

Copy the output to both `.env` files.

## Troubleshooting

### Error: "Failed to decrypt private key"

**Cause:** `ENCRYPTION_KEY` not set or mismatched between frontend/backend

**Solution:**
1. Check both `.env` files have the same key
2. Restart both frontend and backend services
3. Clear browser cache and try again

### Error: "secretOrPrivateKey must be an asymmetric key when using ES256"

**Cause:** After decryption, the key is not in valid PEM format

**Possible reasons:**
1. Wrong encryption key (mismatch between frontend/backend)
2. User provided invalid private key format
3. Decryption failed silently

**Solution:**
1. Verify encryption keys match
2. Ensure user is providing a valid .p8 key from App Store Connect
3. Check backend logs for decryption errors

### Error: "Private key is not in valid PEM format"

**Cause:** The private key doesn't start with `-----BEGIN PRIVATE KEY-----`

**Solution:**
- User needs to provide the complete .p8 file contents
- Key should start with `-----BEGIN PRIVATE KEY-----`
- Key should end with `-----END PRIVATE KEY-----`

## Valid Private Key Format

A valid App Store Connect private key (.p8 file) looks like:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...multiple lines of base64...
...encoded key data...
-----END PRIVATE KEY-----
```

## Testing

1. Open frontend App Store connection form
2. Fill in all fields including a valid .p8 private key
3. Click "Verify Credentials"
4. Check backend logs for:
   - `[AppStore] Encrypted privateKeyPem detected, attempting decryption...`
   - `[AppStore] Private key decrypted successfully`
   - `[AppStore] Generating JWT token...`
   - `[AppStore] JWT token generated successfully`

## Security Notes

- Private keys are NEVER stored unencrypted
- Encryption key must be kept secret
- Use environment variables, never commit keys to git
- Different encryption keys for dev/staging/production

## Files Modified

### Frontend
- `app/components/Integrations/AppDistributionConnectionFlow.tsx` - Encrypts before sending
- `app/utils/encryption.ts` - Encryption utility

### Backend
- `api/script/controllers/integrations/store-controllers.ts` - Decrypts and validates
- `api/script/utils/encryption.utils.ts` - Decryption utility

