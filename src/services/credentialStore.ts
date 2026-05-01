/**
 * Encrypted credential storage using AES encryption
 * Stores API keys encrypted in localStorage.
 */

import CryptoJS from 'crypto-js';
import { ProviderConfig } from './types/ILLMProvider';

export interface StoredCredentials {
  geminiKey?: string;
  deepseekKey?: string;
  chatgptKey?: string;
  claudeKey?: string;
  grokKey?: string;
  ollamaUrl: string;
  selectedModel: string;
  selectedEngine: 'gemini' | 'deepseek' | 'local' | 'chatgpt' | 'claude' | 'grok';
}

const STORAGE_KEY = 'pa_creds_v1';

type EncryptedPayloadV2 = {
  v: 2;
  salt: string;
  ciphertext: string;
};

let sessionPassword: string | null = null;

function isQuotaError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const anyErr = e as any;
  const name = typeof anyErr.name === 'string' ? anyErr.name : '';
  const message = typeof anyErr.message === 'string' ? anyErr.message : '';
  return name === 'QuotaExceededError' || /quota/i.test(message);
}

export function setCredentialPassword(password: string): void {
  sessionPassword = password;
}

export function clearCredentialPassword(): void {
  sessionPassword = null;
}

export function hasCredentialPassword(): boolean {
  return typeof sessionPassword === 'string' && sessionPassword.length > 0;
}

/**
 * Generate a device fingerprint for encryption key derivation
 * Uses browser capabilities to create a stable, unique key per device
 */
function getDeviceFingerprint(): string {
  try {
    // Use a combination of static identifiers
    const fingerprint = {
      ua: navigator.userAgent.slice(0, 50), // First 50 chars only
      lang: navigator.language,
    };

    // Create a simple hash-like fingerprint
    const str = JSON.stringify(fingerprint);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }

    return `prompt-architect-${Math.abs(hash).toString(16).slice(0, 16)}`;
  } catch {
    // Fallback if fingerprinting fails
    return 'prompt-architect-default-key-do-not-use-in-prod';
  }
}

/**
 * Legacy encryption key (v1) derived from device fingerprint.
 */
function getEncryptionKey(): string {
  const key = getDeviceFingerprint();
  if (!key || key.length === 0) {
    throw new Error('Failed to generate encryption key');
  }
  return key;
}

function getV2Key(salt: string): string {
  if (!sessionPassword) {
    throw new Error('Credential password required');
  }
  // Device-binding prevents the same password from decrypting on another device/browser profile.
  const deviceId = getDeviceFingerprint();
  return CryptoJS.SHA256(`${sessionPassword}:${deviceId}:${salt}`).toString();
}

function encodeV2(payload: EncryptedPayloadV2): string {
  return JSON.stringify(payload);
}

function decodeV2(raw: string): EncryptedPayloadV2 | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 2 && typeof parsed.salt === 'string' && typeof parsed.ciphertext === 'string') {
      return parsed as EncryptedPayloadV2;
    }
    return null;
  } catch {
    return null;
  }
}

export function isCredentialsLocked(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const v2 = decodeV2(raw);
  return !!v2 && !hasCredentialPassword();
}

/**
 * Save credentials encrypted to localStorage
 * @throws Error if encryption fails
 */
export function saveCredentials(creds: StoredCredentials): void {
  try {
    const credString = JSON.stringify(creds);
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    const key = getV2Key(salt);
    const encrypted = CryptoJS.AES.encrypt(credString, key).toString();

    // Validate encryption worked
    if (!encrypted || encrypted.length === 0) {
      throw new Error('Encryption produced empty result');
    }

    // Validate we can decrypt (v2)
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    if (decrypted !== credString) {
      throw new Error('Encryption/decryption verification failed');
    }

    localStorage.setItem(
      STORAGE_KEY,
      encodeV2({ v: 2, salt, ciphertext: encrypted })
    );
  } catch (e) {
    console.error('Failed to save encrypted credentials:', e);
    if (isQuotaError(e)) {
      throw new Error(
        'Credential storage failed: browser storage is full. Clear site data (or reduce saved history) and try again.'
      );
    }
    throw new Error(`Credential storage failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve and decrypt credentials from localStorage
 */
export function getCredentials(): StoredCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return getDefaults();
    }

    const v2 = decodeV2(raw);
    if (v2) {
      if (!hasCredentialPassword()) {
        return getDefaults();
      }
      const key = getV2Key(v2.salt);
      const decrypted = CryptoJS.AES.decrypt(v2.ciphertext, key).toString(CryptoJS.enc.Utf8);
      if (!decrypted || decrypted.length === 0) {
        console.warn('Failed to decrypt credentials (v2)');
        return getDefaults();
      }
      const parsed = JSON.parse(decrypted);
      return parsed as StoredCredentials;
    }

    // Legacy v1: ciphertext only
    const encryptionKey = getEncryptionKey();
    const decrypted = CryptoJS.AES.decrypt(raw, encryptionKey).toString(CryptoJS.enc.Utf8);

    if (!decrypted || decrypted.length === 0) {
      console.warn('Failed to decrypt credentials');
      return getDefaults();
    }

    const parsed = JSON.parse(decrypted);
    return parsed as StoredCredentials;
  } catch (e) {
    console.warn('Failed to retrieve credentials, using defaults:', e);
    return getDefaults();
  }
}

export function unlockCredentials(password: string): StoredCredentials {
  setCredentialPassword(password);
  const creds = getCredentials();
  if (isCredentialsLocked()) {
    clearCredentialPassword();
    throw new Error('Invalid password');
  }
  return creds;
}

/**
 * Clear all stored credentials
 */
export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear credentials:', e);
  }
}

/**
 * Get default credentials
 */
export function getDefaults(): StoredCredentials {
  return {
    ollamaUrl: 'http://localhost:11434',
    selectedModel: 'deepseek-r1:7b',
    selectedEngine: 'local',
  };
}

/**
 * Convert stored credentials to provider config
 */
export function credentialsToConfig(creds: StoredCredentials): ProviderConfig {
  return {
    engine: creds.selectedEngine,
    apiKey:
      creds.selectedEngine === 'gemini'
        ? creds.geminiKey
        : creds.selectedEngine === 'deepseek'
          ? creds.deepseekKey
          : creds.selectedEngine === 'chatgpt'
            ? creds.chatgptKey
            : creds.selectedEngine === 'claude'
              ? creds.claudeKey
              : creds.selectedEngine === 'grok'
                ? creds.grokKey
                : undefined,
    ollamaUrl: creds.ollamaUrl,
    selectedModel: creds.selectedModel,
  };
}

/**
 * Update specific credential without overwriting others
 * @throws Error if save fails
 */
export function updateCredential(
  key: keyof StoredCredentials,
  value: any
): StoredCredentials {
  const current = getCredentials();
  const updated = { ...current, [key]: value };
  saveCredentials(updated);
  return updated;
}
