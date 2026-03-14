// Sign data with RSA private key using WebCrypto API
// Private key never leaves the browser

export async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const pemBody = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function signPayload(
  payload: object,
  privateKeyPem: string,
): Promise<string> {
  const key = await importPrivateKey(privateKeyPem);

  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  console.log('[signPayload] exact string being signed:', sorted);

  const data = new TextEncoder().encode(
    JSON.stringify(payload, Object.keys(payload).sort()),
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function hashMessage(message: string): string {
  // SHA-256 via WebCrypto returns a promise — we use it async
  // For a sync hex hash we use this pattern:
  return message; // placeholder — see createStamp below
}

export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createStamp(
  senderId: string,
  messageBody: string,
  privateKeyPem: string,
): Promise<{
  stamp_id: string;
  sender_id: string;
  message_hash: string;
  timestamp: string;
  rsa_signature: string;
}> {
  const stamp_id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const message_hash = messageBody
    ? await sha256(messageBody)
    : await sha256(stamp_id);

  // Only sign fields that are known client-side AND stable server-side
  // Do NOT include message_id (unknown at sign time), origin_ip, origin_device (set server-side)
  const payload = {
    stamp_id,
    sender_id: senderId,
    message_hash,
    timestamp,
  };

  console.log(
    '[createStamp] payload being signed:',
    JSON.stringify(payload, Object.keys(payload).sort()),
  );
  console.log('[createStamp] stamp_id:', stamp_id);
  console.log('[createStamp] sender_id:', senderId);
  console.log('[createStamp] message_hash:', message_hash);
  console.log('[createStamp] timestamp:', timestamp);

  const rsa_signature = await signPayload(payload, privateKeyPem);

  console.log(
    '[createStamp] rsa_signature:',
    rsa_signature.slice(0, 40) + '...',
  );

  return {
    stamp_id,
    sender_id: senderId,
    message_hash,
    timestamp,
    rsa_signature,
  };
}

export async function decryptMessage(
  encryptedBody: string,
  encryptedAesKey: string,
  iv: string,
  privateKeyPem: string,
): Promise<string> {
  // 1. Import RSA private key for decryption
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const rsaKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  );

  // 2. Decrypt AES key with RSA private key
  const encKeyBytes = Uint8Array.from(atob(encryptedAesKey), (c) =>
    c.charCodeAt(0),
  );
  const aesKeyBytes = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaKey,
    encKeyBytes,
  );

  // 3. Import AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesKeyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );

  // 4. Decrypt body
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const cipherBytes = Uint8Array.from(atob(encryptedBody), (c) =>
    c.charCodeAt(0),
  );
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBytes },
    aesKey,
    cipherBytes,
  );

  return new TextDecoder().decode(decryptedBuffer);
}
