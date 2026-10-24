import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '..');
const distDir = path.join(frontendDir, 'dist');
const otaDistDir = path.join(frontendDir, 'ota-dist');

const pkgPath = path.join(frontendDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

async function buildOtaBundle() {
  if (!fs.existsSync(distDir)) {
    console.error('[OTA Packager] Error: frontend/dist does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(otaDistDir)) {
    fs.mkdirSync(otaDistDir, { recursive: true });
  }

  // Determine Release ID: Git SHA or timestamped fallback
  const commitSha = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'local';
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
  const releaseId = process.env.OTA_RELEASE_ID || `rel-${timestamp}-${commitSha}`;

  console.log(`[OTA Packager] Packaging OTA bundle for release: ${releaseId}`);

  const bundleZipPath = path.join(otaDistDir, 'bundle.zip');
  const output = fs.createWriteStream(bundleZipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    // Append files from distDir into the root of the ZIP
    archive.directory(distDir, false);
    archive.finalize();
  });

  const zipBytes = fs.readFileSync(bundleZipPath);
  console.log(`[OTA Packager] Created bundle.zip (${(zipBytes.length / 1024).toFixed(1)} KB)`);

  // Compute SHA-256 Checksum (Hex)
  const checksum = crypto.createHash('sha256').update(zipBytes).digest('hex');
  console.log(`[OTA Packager] SHA-256 Checksum: ${checksum}`);

  // Retrieve RSA Private Key for Signing
  let privateKey = process.env.OTA_SIGNING_PRIVATE_KEY;
  if (!privateKey) {
    const localKeyPath = path.join(frontendDir, 'keys', 'ota_private_key.pem');
    if (fs.existsSync(localKeyPath)) {
      privateKey = fs.readFileSync(localKeyPath, 'utf-8');
      console.log('[OTA Packager] Using local signing key from frontend/keys/ota_private_key.pem');
    }
  }

  if (!privateKey) {
    console.error('[OTA Packager] Error: No RSA private key found in OTA_SIGNING_PRIVATE_KEY or frontend/keys/ota_private_key.pem');
    process.exit(1);
  }

  // Cryptographic Signature: SHA256withRSA Base64
  const signer = crypto.createSign('SHA256');
  signer.update(zipBytes);
  signer.end();
  const signature = signer.sign(privateKey, 'base64');
  console.log(`[OTA Packager] Generated cryptographic RSA signature (${signature.length} chars)`);

  // Determine bundle download URL
  // Default points to GitHub Releases asset for this tag
  const repoSlug = process.env.GITHUB_REPOSITORY || 'Kishan-rao/DonateConnect---Major-Project-';
  const bundleUrl =
    process.env.OTA_BUNDLE_URL ||
    `https://github.com/${repoSlug}/releases/download/ota-${releaseId}/bundle.zip`;

  const manifest = {
    releaseId,
    version: pkg.version,
    minNativeVersion: '1.0',
    bundleUrl,
    checksum,
    signature,
    createdAt: new Date().toISOString(),
  };

  const manifestPath = path.join(otaDistDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`[OTA Packager] Manifest written to ${manifestPath}`);
  console.log(JSON.stringify(manifest, null, 2));
  console.log('[OTA Packager] Bundle packaging complete!');
}

buildOtaBundle().catch((err) => {
  console.error('[OTA Packager] Failed:', err);
  process.exit(1);
});
