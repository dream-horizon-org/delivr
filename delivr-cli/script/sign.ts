/**
 * ============================================================================
 * Design Rationale: Cryptographic Code Signing for OTA Updates
 * ============================================================================
 * 
 * PURPOSE:
 * 
 * Sign OTA update bundles with RSA private keys to prevent:
 * 1. Man-in-the-middle attacks injecting malicious JavaScript
 * 2. Compromised CDN serving tampered bundles
 * 3. Unauthorized code execution on user devices
 * 
 * THREAT MODEL:
 * 
 * Without code signing, an attacker could:
 * - Intercept update download and inject `require('evil-module')`
 * - Gain S3 write access and replace bundle with malicious code
 * - Compromise CDN and serve backdoored bundles
 * 
 * Result: Arbitrary code execution on millions of devices (catastrophic)
 * 
 * IMPLEMENTATION:
 * 
 * Uses JWT (JSON Web Token) with RS256 algorithm (RSA-SHA256):
 * 
 * 1. CLI generates content hash of entire update bundle
 *    - Hash algorithm: SHA-256 (same as git commits)
 *    - Includes all files in bundle directory
 *    - Ignores metadata file itself (.codepushrelease)
 * 
 * 2. CLI signs claims (version + contentHash) with RSA private key:
 *    {
 *      "claimVersion": "1.0.0",
 *      "contentHash": "abc123..."
 *    }
 * 
 * 3. Signature stored as JWT in .codepushrelease file (JSON)
 * 
 * 4. Mobile SDK verifies JWT using embedded RSA public key
 *    - Public key embedded in iOS/Android app binary at compile time
 *    - SDK verifies signature BEFORE applying update
 *    - If verification fails → reject update, report to server
 * 
 * WHY JWT/RS256 OVER ALTERNATIVES:
 * 
 * 1. HMAC-SHA256 (symmetric signing)
 *    - Rejected: Requires sharing secret with SDK
 *    - Problem: Anyone can decompile mobile app and extract HMAC key
 *    - Attacker with key can sign malicious bundles (game over)
 * 
 * 2. Raw RSA signatures (OpenSSL dgst -sign)
 *    - Rejected: No standard format, hard to parse
 *    - JWT is standard, widely supported, includes metadata
 * 
 * 3. Ed25519 (EdDSA, elliptic curve)
 *    - Pros: Faster, smaller keys, modern crypto
 *    - Cons: Less widely supported in mobile crypto libraries (2015)
 *    - Decision: Use RSA-2048 for maximum compatibility
 * 
 * 4. No signing, just TLS/HTTPS
 *    - Rejected: Only protects against MITM, not compromised CDN
 *    - TLS certificate could expire or be revoked
 *    - Doesn't protect bundle at rest (e.g., cached on device)
 * 
 * KEY MANAGEMENT:
 * 
 * Private key security is CRITICAL:
 * - Store in CI/CD secrets (GitHub Actions, Jenkins credentials)
 * - NEVER commit to git repository (use .gitignore)
 * - Rotate keys yearly (new key → new app version required)
 * - One key per app (not per deployment or per release)
 * 
 * Public key distribution:
 * - Embedded in mobile app binary at build time
 * - Distributed via App Store/Play Store (trusted channel)
 * - Cannot be changed after app is published (requires new app version)
 * 
 * LESSON LEARNED:
 * 
 * Code signing is NON-NEGOTIABLE for OTA updates. Any OTA system without
 * cryptographic verification is fundamentally insecure.
 * 
 * Real-world attack prevented by code signing:
 * - Attacker gains AWS credentials via phishing
 * - Uploads malicious bundle to S3 with backdoor
 * - Mobile SDK downloads bundle, verifies signature
 * - Signature invalid (attacker doesn't have private key)
 * - Update rejected, millions of users protected
 * 
 * TRADE-OFFS:
 * 
 * Benefits:
 * - Prevents unauthorized code execution (security is paramount)
 * - Works even if CDN is compromised (defense in depth)
 * - Provides cryptographic proof of authenticity
 * 
 * Costs:
 * - Key management complexity (must protect private key)
 * - Can't revoke already-released bundles (signature valid forever)
 *   - Mitigated by: Server-side killswitch (stop serving bundle)
 * - Key rotation requires new app version (can't update public key OTA)
 * - Signature verification adds latency (~50-100ms for 10MB bundle)
 *   - Acceptable: Security > speed for code execution
 * 
 * WHEN NOT TO USE CODE SIGNING:
 * 
 * - Non-executable content (images, text files) where tampering isn't dangerous
 * - Trusted private network where MITM attacks are impossible
 * - Static website content (no code execution)
 * 
 * ALTERNATIVES CONSIDERED:
 * 
 * 1. Hash-based verification (compare SHA256 of bundle)
 *    - Rejected: Hash must be transmitted separately, same MITM problem
 *    - Attacker can replace bundle AND hash together
 * 
 * 2. Certificate pinning only (trust specific TLS cert)
 *    - Complementary: Use both code signing AND cert pinning
 *    - Cert pinning alone doesn't protect against compromised CDN
 * 
 * 3. App Store review for every change
 *    - Rejected: Defeats purpose of OTA (24-72 hour delay)
 * 
 * SECURITY BEST PRACTICES:
 * 
 * 1. Verify signature BEFORE applying update (SDK responsibility)
 * 2. Store private key in hardware security module (HSM) if available
 * 3. Use separate signing keys for staging vs. production
 * 4. Log all signing operations for audit trail
 * 5. Monitor for signature verification failures (potential attack)
 * 
 * RELATED FILES:
 * 
 * - hash-utils.ts: Generates SHA-256 hash of bundle directory
 * - SDK verification logic: Verifies JWT signature before applying update
 * 
 * ============================================================================
 */

import * as fs from "fs/promises";
import * as hashUtils from "./hash-utils";
import * as path from "path";
import * as jwt from "jsonwebtoken";
import { copyFileToTmpDir, isDirectory } from "./utils/file-utils";

const CURRENT_CLAIM_VERSION: string = "1.0.0";
const METADATA_FILE_NAME: string = ".codepushrelease";

interface CodeSigningClaims {
  claimVersion: string;
  contentHash: string;
}

export default async function sign(privateKeyPath: string, updateContentsPath: string): Promise<void> {
  if (!privateKeyPath) {
    return Promise.resolve<void>(null);
  }

  let privateKey: Buffer;

  try {
    privateKey = await fs.readFile(privateKeyPath);
  } catch (err) {
    return Promise.reject(new Error(`The path specified for the signing key ("${privateKeyPath}") was not valid.`));
  }

  // If releasing a single file, copy the file to a temporary 'CodePush' directory in which to publish the release
  try {
    if (!isDirectory(updateContentsPath)) {
      updateContentsPath = copyFileToTmpDir(updateContentsPath);
    }
  } catch (error) {
    Promise.reject(error);
  }

  const signatureFilePath: string = path.join(updateContentsPath, METADATA_FILE_NAME);
  let prevSignatureExists = true;
  try {
    await fs.access(signatureFilePath, fs.constants.F_OK);
  } catch (err) {
    if (err.code === "ENOENT") {
      prevSignatureExists = false;
    } else {
      return Promise.reject<void>(
        new Error(
          `Could not delete previous release signature at ${signatureFilePath}.
                Please, check your access rights.`
        )
      );
    }
  }

  if (prevSignatureExists) {
    console.log(`Deleting previous release signature at ${signatureFilePath}`);
    await fs.rmdir(signatureFilePath);
  }

  const hash: string = await hashUtils.generatePackageHashFromDirectory(updateContentsPath, path.join(updateContentsPath, ".."));
  const claims: CodeSigningClaims = {
    claimVersion: CURRENT_CLAIM_VERSION,
    contentHash: hash,
  };

  return new Promise<void>((resolve, reject) => {
    jwt.sign(claims, privateKey, { algorithm: "RS256" }, async (err: Error, signedJwt: string) => {
      if (err) {
        reject(new Error("The specified signing key file was not valid"));
      }

      try {
        await fs.writeFile(signatureFilePath, signedJwt);
        console.log(`Generated a release signature and wrote it to ${signatureFilePath}`);
        resolve(null);
      } catch (error) {
        reject(error);
      }
    });
  });
}
