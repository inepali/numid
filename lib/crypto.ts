// Utility functions for base64 conversions that are SSR-safe (working in both Node.js and Browser)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Get the cryptographic SubtleCrypto interface (natively works in browser and Node)
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  // Fallback for Node environments without globalThis.crypto
  const cryptoModule = require("crypto");
  return cryptoModule.webcrypto.subtle;
}

// Get standard random bytes generator
function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  }
  const cryptoModule = require("crypto");
  return cryptoModule.randomFillSync(array);
}

/**
 * Derives a 256-bit AES-GCM key from a password and a salt using PBKDF2
 */
async function deriveKey(password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  
  const encoder = new TextEncoder();
  const passwordKey = await subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Encrypts a plaintext string with a password using client-side E2EE
 */
export async function encryptText(plaintext: string, password: string): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  
  // Generate random salt (16 bytes) and initialization vector (12 bytes)
  const saltBytes = new Uint8Array(16);
  getRandomValues(saltBytes);
  
  const ivBytes = new Uint8Array(12);
  getRandomValues(ivBytes);

  // Derive AES key from password and salt
  const key = await deriveKey(password, saltBytes.buffer);

  // Encrypt plaintext
  const encoder = new TextEncoder();
  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes.buffer
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(ivBytes.buffer),
    salt: arrayBufferToBase64(saltBytes.buffer)
  };
}

/**
 * Decrypts a ciphertext with a password using client-side E2EE
 */
export async function decryptText(payload: EncryptedPayload, password: string): Promise<string> {
  const subtle = getSubtleCrypto();
  
  const saltBuffer = base64ToArrayBuffer(payload.salt);
  const ivBuffer = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  // Derive AES key
  const key = await deriveKey(password, saltBuffer);

  // Decrypt buffer
  const decryptedBuffer = await subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer
    },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
