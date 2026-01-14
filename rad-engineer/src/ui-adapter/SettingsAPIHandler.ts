/**
 * SettingsAPIHandler - Settings & Profile Management for rad-engineer Integration
 *
 * Responsibilities:
 * - Settings CRUD operations
 * - Profile management (API keys with encryption)
 * - Secure storage via file system with AES-256 encryption
 * - Active profile management
 *
 * Security:
 * - API keys encrypted with AES-256-GCM before storage
 * - Encryption key derived from system-specific seed
 * - Settings stored in .rad-engineer-integration/settings.json
 */

import { EventEmitter } from "events";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Supported provider types for API profiles
 */
export type ProviderType = "anthropic" | "openai" | "ollama" | "glm";

/**
 * API Profile configuration
 */
export interface APIProfile {
  /** Unique profile ID */
  id: string;
  /** Profile name (user-friendly) */
  name: string;
  /** Provider type */
  provider: ProviderType;
  /** API key (encrypted when stored) */
  apiKey: string;
  /** Optional base URL for custom endpoints */
  baseURL?: string;
  /** Optional model override */
  model?: string;
  /** Whether this is the active profile */
  isActive: boolean;
}

/**
 * Application settings
 */
export interface AppSettings {
  /** Settings version for migration support */
  version: string;
  /** Array of API profiles */
  profiles: APIProfile[];
  /** General preferences */
  preferences: {
    /** Theme preference */
    theme?: "light" | "dark" | "system";
    /** Auto-save interval in seconds */
    autoSaveInterval?: number;
    /** Enable debug logging */
    debugMode?: boolean;
    /** Language preference */
    language?: string;
  };
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Configuration for SettingsAPIHandler
 */
export interface SettingsAPIHandlerConfig {
  /** Project directory path */
  projectDir: string;
  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Encrypted data format stored on disk
 */
interface EncryptedData {
  /** Encrypted content (hex-encoded) */
  encrypted: string;
  /** Initialization vector (hex-encoded) */
  iv: string;
  /** Authentication tag (hex-encoded) */
  authTag: string;
}

/**
 * Settings file structure on disk
 */
interface SettingsFile {
  /** Settings version */
  version: string;
  /** Encrypted profiles */
  profiles: Array<Omit<APIProfile, "apiKey"> & { apiKey: EncryptedData }>;
  /** Preferences (not encrypted) */
  preferences: AppSettings["preferences"];
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * SettingsAPIHandler - Manages settings and profile operations with secure storage
 *
 * @example
 * ```ts
 * const handler = new SettingsAPIHandler({
 *   projectDir: "/path/to/project",
 * });
 *
 * // Get settings
 * const settings = await handler.getSettings();
 *
 * // Add profile
 * const profile = await handler.addProfile({
 *   id: "profile-1",
 *   name: "My Anthropic Key",
 *   provider: "anthropic",
 *   apiKey: "sk-ant-...",
 *   isActive: true,
 * });
 *
 * // Update settings
 * await handler.updateSettings({
 *   preferences: { theme: "dark" }
 * });
 *
 * // Listen for updates
 * handler.on("settings-updated", (settings) => {
 *   console.log("Settings changed");
 * });
 * ```
 */
export class SettingsAPIHandler extends EventEmitter {
  private readonly config: SettingsAPIHandlerConfig;
  private readonly settingsDir: string;
  private readonly settingsFile: string;
  private readonly encryptionKey: Buffer;

  // Encryption constants
  private readonly ALGORITHM = "aes-256-gcm";
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 32;

  constructor(config: SettingsAPIHandlerConfig) {
    super();
    this.config = config;
    this.settingsDir = join(config.projectDir, ".rad-engineer-integration");
    this.settingsFile = join(this.settingsDir, "settings.json");

    // Derive encryption key from system-specific seed
    this.encryptionKey = this.deriveEncryptionKey();

    // Ensure settings directory exists
    if (!existsSync(this.settingsDir)) {
      mkdirSync(this.settingsDir, { recursive: true });
    }

    if (this.config.debug) {
      console.log(`[SettingsAPIHandler] Initialized for project: ${config.projectDir}`);
    }
  }

  /**
   * Derive encryption key from system-specific seed
   *
   * Uses scrypt for key derivation with system-specific salt
   * This ensures the key is consistent per machine but not easily guessable
   *
   * @returns Derived encryption key buffer
   */
  private deriveEncryptionKey(): Buffer {
    const saltFile = join(this.settingsDir, ".key-salt");

    // Ensure directory exists for salt file
    if (!existsSync(this.settingsDir)) {
      mkdirSync(this.settingsDir, { recursive: true });
    }

    let salt: Buffer;

    // Load or create salt
    if (existsSync(saltFile)) {
      salt = readFileSync(saltFile);
    } else {
      // Generate new salt
      salt = randomBytes(this.SALT_LENGTH);
      writeFileSync(saltFile, salt, { mode: 0o600 }); // Secure file permissions
    }

    // Derive key using scrypt (CPU-intensive key derivation)
    // Use a passphrase that includes machine-specific identifiers
    const passphrase = `rad-engineer-settings-${process.platform}-${process.arch}`;
    const key = scryptSync(passphrase, salt, this.KEY_LENGTH);

    return key;
  }

  /**
   * Encrypt API key using AES-256-GCM
   *
   * @param apiKey - Plain text API key
   * @returns Encrypted data with IV and auth tag
   */
  private encryptAPIKey(apiKey: string): EncryptedData {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt API key using AES-256-GCM
   *
   * @param encryptedData - Encrypted data with IV and auth tag
   * @returns Decrypted API key
   * @throws Error if decryption fails (tampering or wrong key)
   */
  private decryptAPIKey(encryptedData: EncryptedData): string {
    try {
      const iv = Buffer.from(encryptedData.iv, "hex");
      const authTag = Buffer.from(encryptedData.authTag, "hex");
      const decipher = createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error(
        `Failed to decrypt API key: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Load settings from file
   *
   * @returns App settings with decrypted API keys
   */
  private loadSettings(): AppSettings {
    if (!existsSync(this.settingsFile)) {
      // Return default settings if file doesn't exist
      return {
        version: "1.0.0",
        profiles: [],
        preferences: {
          theme: "system",
          autoSaveInterval: 30,
          debugMode: false,
          language: "en",
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    try {
      const content = readFileSync(this.settingsFile, "utf-8");
      const fileData: SettingsFile = JSON.parse(content);

      // Decrypt API keys in profiles
      const profiles = fileData.profiles.map((profile) => ({
        ...profile,
        apiKey: this.decryptAPIKey(profile.apiKey),
      }));

      return {
        version: fileData.version,
        profiles,
        preferences: fileData.preferences,
        lastUpdated: fileData.lastUpdated,
      };
    } catch (error) {
      throw new Error(
        `Failed to load settings: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Save settings to file with encrypted API keys
   *
   * @param settings - App settings to save
   */
  private saveSettings(settings: AppSettings): void {
    try {
      // Encrypt API keys in profiles
      const profiles = settings.profiles.map((profile) => ({
        ...profile,
        apiKey: this.encryptAPIKey(profile.apiKey),
      }));

      const fileData: SettingsFile = {
        version: settings.version,
        profiles,
        preferences: settings.preferences,
        lastUpdated: new Date().toISOString(),
      };

      writeFileSync(this.settingsFile, JSON.stringify(fileData, null, 2), {
        mode: 0o600, // Secure file permissions (read/write for owner only)
      });

      if (this.config.debug) {
        console.log(`[SettingsAPIHandler] Settings saved to ${this.settingsFile}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to save settings: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get all settings
   *
   * Process:
   * 1. Load settings from file
   * 2. Decrypt API keys
   * 3. Return settings
   *
   * @returns Current app settings
   */
  async getSettings(): Promise<AppSettings> {
    return this.loadSettings();
  }

  /**
   * Update settings
   *
   * Process:
   * 1. Load current settings
   * 2. Apply partial updates
   * 3. Save updated settings
   * 4. Emit settings-updated event
   *
   * @param updates - Partial settings updates
   * @returns Updated app settings
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const currentSettings = this.loadSettings();

    // Apply updates (deep merge for preferences)
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...updates,
      preferences: {
        ...currentSettings.preferences,
        ...updates.preferences,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Save to file
    this.saveSettings(updatedSettings);

    // Emit event
    this.emit("settings-updated", updatedSettings);

    if (this.config.debug) {
      console.log("[SettingsAPIHandler] Settings updated");
    }

    return updatedSettings;
  }

  /**
   * Get all profiles
   *
   * @returns Array of API profiles
   */
  async getProfiles(): Promise<APIProfile[]> {
    const settings = this.loadSettings();
    return settings.profiles;
  }

  /**
   * Add a new profile
   *
   * Process:
   * 1. Load current settings
   * 2. Validate profile ID is unique
   * 3. If profile is active, deactivate other profiles
   * 4. Add profile to list
   * 5. Save settings
   * 6. Emit profile-added event
   *
   * @param profile - API profile to add
   * @returns Added profile
   * @throws Error if profile ID already exists
   */
  async addProfile(profile: APIProfile): Promise<APIProfile> {
    const settings = this.loadSettings();

    // Check for duplicate ID
    if (settings.profiles.some((p) => p.id === profile.id)) {
      throw new Error(`Profile with ID ${profile.id} already exists`);
    }

    // If this profile is active, deactivate others
    if (profile.isActive) {
      settings.profiles.forEach((p) => {
        p.isActive = false;
      });
    }

    // Add profile
    settings.profiles.push(profile);
    settings.lastUpdated = new Date().toISOString();

    // Save settings
    this.saveSettings(settings);

    // Emit event
    this.emit("profile-added", profile);

    if (this.config.debug) {
      console.log(`[SettingsAPIHandler] Profile added: ${profile.id}`);
    }

    return profile;
  }

  /**
   * Remove a profile
   *
   * Process:
   * 1. Load current settings
   * 2. Find and remove profile by ID
   * 3. If removed profile was active, activate first remaining profile
   * 4. Save settings
   * 5. Emit profile-removed event
   *
   * @param profileId - Profile ID to remove
   * @returns True if removed, false if not found
   */
  async removeProfile(profileId: string): Promise<boolean> {
    const settings = this.loadSettings();
    const profileIndex = settings.profiles.findIndex((p) => p.id === profileId);

    if (profileIndex === -1) {
      return false;
    }

    const wasActive = settings.profiles[profileIndex].isActive;

    // Remove profile
    settings.profiles.splice(profileIndex, 1);

    // If removed profile was active, activate first remaining profile
    if (wasActive && settings.profiles.length > 0) {
      settings.profiles[0].isActive = true;
    }

    settings.lastUpdated = new Date().toISOString();

    // Save settings
    this.saveSettings(settings);

    // Emit event
    this.emit("profile-removed", profileId);

    if (this.config.debug) {
      console.log(`[SettingsAPIHandler] Profile removed: ${profileId}`);
    }

    return true;
  }

  /**
   * Set active profile
   *
   * Process:
   * 1. Load current settings
   * 2. Validate profile exists
   * 3. Deactivate all profiles
   * 4. Activate target profile
   * 5. Save settings
   * 6. Emit active-profile-changed event
   *
   * @param profileId - Profile ID to activate
   * @returns True if activated, false if not found
   */
  async setActiveProfile(profileId: string): Promise<boolean> {
    const settings = this.loadSettings();
    const profile = settings.profiles.find((p) => p.id === profileId);

    if (!profile) {
      return false;
    }

    // Deactivate all profiles
    settings.profiles.forEach((p) => {
      p.isActive = false;
    });

    // Activate target profile
    profile.isActive = true;
    settings.lastUpdated = new Date().toISOString();

    // Save settings
    this.saveSettings(settings);

    // Emit event
    this.emit("active-profile-changed", profileId);

    if (this.config.debug) {
      console.log(`[SettingsAPIHandler] Active profile set: ${profileId}`);
    }

    return true;
  }

  /**
   * Get active profile
   *
   * @returns Active profile or null if none active
   */
  async getActiveProfile(): Promise<APIProfile | null> {
    const settings = this.loadSettings();
    return settings.profiles.find((p) => p.isActive) || null;
  }
}
