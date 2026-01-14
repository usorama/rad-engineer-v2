/**
 * Unit tests for SettingsAPIHandler
 *
 * Tests:
 * - Settings CRUD operations
 * - Profile management (add, remove, activate)
 * - API key encryption/decryption
 * - File persistence
 * - Event emissions
 * - Error handling (duplicate IDs, invalid profiles)
 * - Secure storage (file permissions)
 *
 * Coverage requirements:
 * - Branches: 90%+
 * - Functions: 90%+
 * - Lines: 90%+
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { SettingsAPIHandler } from "@/ui-adapter/SettingsAPIHandler.js";
import type {
  SettingsAPIHandlerConfig,
  APIProfile,
  AppSettings,
} from "@/ui-adapter/SettingsAPIHandler.js";
import { promises as fs } from "fs";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

describe("SettingsAPIHandler: getSettings", () => {
  let handler: SettingsAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-settings-handler");
    await fs.mkdir(tempDir, { recursive: true });

    const config: SettingsAPIHandlerConfig = {
      projectDir: tempDir,
    };
    handler = new SettingsAPIHandler(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Returns default settings when no file exists", async () => {
    const settings = await handler.getSettings();

    expect(settings.version).toBe("1.0.0");
    expect(settings.profiles).toEqual([]);
    expect(settings.preferences).toBeDefined();
    expect(settings.preferences.theme).toBe("system");
    expect(settings.preferences.autoSaveInterval).toBe(30);
    expect(settings.preferences.debugMode).toBe(false);
    expect(settings.lastUpdated).toBeDefined();
  });

  it("Loads settings from file on subsequent calls", async () => {
    // Create a profile
    const profile: APIProfile = {
      id: "profile-1",
      name: "Test Profile",
      provider: "anthropic",
      apiKey: "sk-ant-test-key",
      isActive: true,
    };

    await handler.addProfile(profile);

    // Create new handler instance (simulates app restart)
    const newHandler = new SettingsAPIHandler({
      projectDir: tempDir,
    });

    const settings = await newHandler.getSettings();

    expect(settings.profiles).toHaveLength(1);
    expect(settings.profiles[0].name).toBe("Test Profile");
    expect(settings.profiles[0].apiKey).toBe("sk-ant-test-key"); // Should be decrypted
  });

  it("Settings file has secure permissions (600)", async () => {
    await handler.addProfile({
      id: "profile-1",
      name: "Test",
      provider: "anthropic",
      apiKey: "sk-ant-test",
      isActive: true,
    });

    const settingsFile = join(tempDir, ".rad-engineer-integration", "settings.json");
    const stats = await fs.stat(settingsFile);

    // Check file permissions (0o600 = 384 in decimal, owner read/write only)
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe("SettingsAPIHandler: updateSettings", () => {
  let handler: SettingsAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-settings-update");
    await fs.mkdir(tempDir, { recursive: true });

    handler = new SettingsAPIHandler({ projectDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Updates preferences and persists to file", async () => {
    const updates: Partial<AppSettings> = {
      preferences: {
        theme: "dark",
        debugMode: true,
      },
    };

    const updatedSettings = await handler.updateSettings(updates);

    expect(updatedSettings.preferences.theme).toBe("dark");
    expect(updatedSettings.preferences.debugMode).toBe(true);
    expect(updatedSettings.preferences.autoSaveInterval).toBe(30); // Should preserve existing

    // Verify persistence
    const newHandler = new SettingsAPIHandler({ projectDir: tempDir });
    const loadedSettings = await newHandler.getSettings();

    expect(loadedSettings.preferences.theme).toBe("dark");
    expect(loadedSettings.preferences.debugMode).toBe(true);
  });

  it("Emits settings-updated event", async () => {
    let eventFired = false;
    let eventData: AppSettings | null = null;

    handler.on("settings-updated", (settings: AppSettings) => {
      eventFired = true;
      eventData = settings;
    });

    await handler.updateSettings({
      preferences: { theme: "light" as const },
    });

    expect(eventFired).toBe(true);
    expect(eventData).not.toBeNull();
    expect(eventData!.preferences.theme).toBe("light");
  });

  it("Updates lastUpdated timestamp", async () => {
    const initialSettings = await handler.getSettings();
    const initialTimestamp = initialSettings.lastUpdated;

    // Wait a bit to ensure timestamp changes
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updatedSettings = await handler.updateSettings({
      preferences: { theme: "dark" },
    });

    expect(updatedSettings.lastUpdated).not.toBe(initialTimestamp);
  });

  it("Deep merges preferences without overwriting unspecified fields", async () => {
    // Set initial preferences
    await handler.updateSettings({
      preferences: {
        theme: "dark",
        autoSaveInterval: 60,
        debugMode: true,
      },
    });

    // Update only theme
    await handler.updateSettings({
      preferences: { theme: "light" as const },
    });

    const settings = await handler.getSettings();

    expect(settings.preferences.theme).toBe("light");
    expect(settings.preferences.autoSaveInterval).toBe(60); // Preserved
    expect(settings.preferences.debugMode).toBe(true); // Preserved
  });
});

describe("SettingsAPIHandler: Profile Management", () => {
  let handler: SettingsAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-settings-profiles");
    await fs.mkdir(tempDir, { recursive: true });

    handler = new SettingsAPIHandler({ projectDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("addProfile", () => {
    it("Adds a new profile and persists to file", async () => {
      const profile: APIProfile = {
        id: "profile-1",
        name: "Anthropic Profile",
        provider: "anthropic",
        apiKey: "sk-ant-test-key-12345",
        baseURL: "https://api.anthropic.com",
        model: "claude-3-5-sonnet-20241022",
        isActive: true,
      };

      const addedProfile = await handler.addProfile(profile);

      expect(addedProfile.id).toBe("profile-1");
      expect(addedProfile.name).toBe("Anthropic Profile");
      expect(addedProfile.apiKey).toBe("sk-ant-test-key-12345");

      // Verify persistence
      const profiles = await handler.getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("Anthropic Profile");
    });

    it("Encrypts API key in storage", async () => {
      const profile: APIProfile = {
        id: "profile-1",
        name: "Test",
        provider: "anthropic",
        apiKey: "sk-ant-plain-text-key",
        isActive: true,
      };

      await handler.addProfile(profile);

      // Read raw file and verify API key is encrypted
      const settingsFile = join(tempDir, ".rad-engineer-integration", "settings.json");
      const rawContent = readFileSync(settingsFile, "utf-8");
      const fileData = JSON.parse(rawContent);

      // API key should be an object with encrypted, iv, authTag
      const storedApiKey = fileData.profiles[0].apiKey;
      expect(storedApiKey).toHaveProperty("encrypted");
      expect(storedApiKey).toHaveProperty("iv");
      expect(storedApiKey).toHaveProperty("authTag");

      // Encrypted value should not contain plain text
      expect(rawContent).not.toContain("sk-ant-plain-text-key");
    });

    it("Throws error for duplicate profile ID", async () => {
      const profile: APIProfile = {
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test",
        isActive: true,
      };

      await handler.addProfile(profile);

      // Try to add duplicate
      await expect(
        handler.addProfile({
          ...profile,
          name: "Profile 1 Duplicate",
        })
      ).rejects.toThrow("Profile with ID profile-1 already exists");
    });

    it("Deactivates other profiles when adding active profile", async () => {
      // Add first active profile
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: true,
      });

      // Add second active profile
      await handler.addProfile({
        id: "profile-2",
        name: "Profile 2",
        provider: "openai",
        apiKey: "sk-openai-test-2",
        isActive: true,
      });

      const profiles = await handler.getProfiles();

      expect(profiles).toHaveLength(2);
      const profile1 = profiles.find((p) => p.id === "profile-1");
      const profile2 = profiles.find((p) => p.id === "profile-2");
      expect(profile1?.isActive).toBe(false);
      expect(profile2?.isActive).toBe(true);
    });

    it("Emits profile-added event", async () => {
      let eventFired = false;
      let eventProfile: APIProfile | null = null;

      handler.on("profile-added", (profile: APIProfile) => {
        eventFired = true;
        eventProfile = profile;
      });

      const profile: APIProfile = {
        id: "profile-1",
        name: "Test",
        provider: "anthropic",
        apiKey: "sk-ant-test",
        isActive: true,
      };

      await handler.addProfile(profile);

      expect(eventFired).toBe(true);
      expect(eventProfile).not.toBeNull();
      expect(eventProfile!.id).toBe("profile-1");
    });

    it("Supports all provider types", async () => {
      const providers = [
        { provider: "anthropic" as const, apiKey: "sk-ant-test" },
        { provider: "openai" as const, apiKey: "sk-openai-test" },
        { provider: "ollama" as const, apiKey: "" }, // Ollama doesn't need API key
        { provider: "glm" as const, apiKey: "glm-test-key" },
      ];

      for (let i = 0; i < providers.length; i++) {
        await handler.addProfile({
          id: `profile-${i}`,
          name: `Profile ${i}`,
          provider: providers[i].provider,
          apiKey: providers[i].apiKey,
          isActive: i === 0,
        });
      }

      const profiles = await handler.getProfiles();
      expect(profiles).toHaveLength(4);
      expect(profiles.map((p) => p.provider)).toEqual(["anthropic", "openai", "ollama", "glm"]);
    });
  });

  describe("removeProfile", () => {
    it("Removes a profile by ID", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test",
        isActive: true,
      });

      const removed = await handler.removeProfile("profile-1");

      expect(removed).toBe(true);

      const profiles = await handler.getProfiles();
      expect(profiles).toHaveLength(0);
    });

    it("Returns false for non-existent profile", async () => {
      const removed = await handler.removeProfile("non-existent");

      expect(removed).toBe(false);
    });

    it("Activates first remaining profile when removing active profile", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: true,
      });

      await handler.addProfile({
        id: "profile-2",
        name: "Profile 2",
        provider: "openai",
        apiKey: "sk-openai-test-2",
        isActive: false,
      });

      // Remove active profile
      await handler.removeProfile("profile-1");

      const profiles = await handler.getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe("profile-2");
      expect(profiles[0].isActive).toBe(true); // Should be activated
    });

    it("Emits profile-removed event", async () => {
      let eventFired = false;
      let removedId: string = "";

      handler.on("profile-removed", (profileId: string) => {
        eventFired = true;
        removedId = profileId;
      });

      await handler.addProfile({
        id: "profile-1",
        name: "Test",
        provider: "anthropic",
        apiKey: "sk-ant-test",
        isActive: true,
      });

      await handler.removeProfile("profile-1");

      expect(eventFired).toBe(true);
      expect(removedId).toBe("profile-1");
    });
  });

  describe("setActiveProfile", () => {
    it("Sets a profile as active and deactivates others", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: true,
      });

      await handler.addProfile({
        id: "profile-2",
        name: "Profile 2",
        provider: "openai",
        apiKey: "sk-openai-test-2",
        isActive: false,
      });

      const activated = await handler.setActiveProfile("profile-2");

      expect(activated).toBe(true);

      const profiles = await handler.getProfiles();
      const profile1 = profiles.find((p) => p.id === "profile-1");
      const profile2 = profiles.find((p) => p.id === "profile-2");
      expect(profile1?.isActive).toBe(false);
      expect(profile2?.isActive).toBe(true);
    });

    it("Returns false for non-existent profile", async () => {
      const activated = await handler.setActiveProfile("non-existent");

      expect(activated).toBe(false);
    });

    it("Emits active-profile-changed event", async () => {
      let eventFired = false;
      let activeId: string = "";

      handler.on("active-profile-changed", (profileId: string) => {
        eventFired = true;
        activeId = profileId;
      });

      await handler.addProfile({
        id: "profile-1",
        name: "Test",
        provider: "anthropic",
        apiKey: "sk-ant-test",
        isActive: false,
      });

      await handler.setActiveProfile("profile-1");

      expect(eventFired).toBe(true);
      expect(activeId).toBe("profile-1");
    });
  });

  describe("getProfiles", () => {
    it("Returns all profiles", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: true,
      });

      await handler.addProfile({
        id: "profile-2",
        name: "Profile 2",
        provider: "openai",
        apiKey: "sk-openai-test-2",
        isActive: false,
      });

      const profiles = await handler.getProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles.map((p) => p.id)).toEqual(["profile-1", "profile-2"]);
    });

    it("Returns empty array when no profiles exist", async () => {
      const profiles = await handler.getProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe("getActiveProfile", () => {
    it("Returns the active profile", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: false,
      });

      await handler.addProfile({
        id: "profile-2",
        name: "Profile 2",
        provider: "openai",
        apiKey: "sk-openai-test-2",
        isActive: true,
      });

      const activeProfile = await handler.getActiveProfile();

      expect(activeProfile).not.toBeNull();
      expect(activeProfile!.id).toBe("profile-2");
      expect(activeProfile!.isActive).toBe(true);
    });

    it("Returns null when no profile is active", async () => {
      await handler.addProfile({
        id: "profile-1",
        name: "Profile 1",
        provider: "anthropic",
        apiKey: "sk-ant-test-1",
        isActive: false,
      });

      const activeProfile = await handler.getActiveProfile();

      expect(activeProfile).toBeNull();
    });
  });
});

describe("SettingsAPIHandler: Encryption", () => {
  let handler: SettingsAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-settings-encryption");
    await fs.mkdir(tempDir, { recursive: true });

    handler = new SettingsAPIHandler({ projectDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Decrypts API keys correctly after restart", async () => {
    const originalKey = "sk-ant-test-key-with-special-chars-!@#$%^&*()";

    await handler.addProfile({
      id: "profile-1",
      name: "Test",
      provider: "anthropic",
      apiKey: originalKey,
      isActive: true,
    });

    // Create new handler (simulates app restart)
    const newHandler = new SettingsAPIHandler({ projectDir: tempDir });
    const profiles = await newHandler.getProfiles();

    expect(profiles[0].apiKey).toBe(originalKey);
  });

  it("Creates and uses consistent encryption key salt", async () => {
    await handler.addProfile({
      id: "profile-1",
      name: "Test",
      provider: "anthropic",
      apiKey: "sk-ant-test-key",
      isActive: true,
    });

    const saltFile = join(tempDir, ".rad-engineer-integration", ".key-salt");
    expect(existsSync(saltFile)).toBe(true);

    // Salt file should have secure permissions
    const stats = await fs.stat(saltFile);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("Uses unique IV for each encryption", async () => {
    await handler.addProfile({
      id: "profile-1",
      name: "Test 1",
      provider: "anthropic",
      apiKey: "sk-ant-test-key-1",
      isActive: true,
    });

    await handler.addProfile({
      id: "profile-2",
      name: "Test 2",
      provider: "anthropic",
      apiKey: "sk-ant-test-key-2",
      isActive: false,
    });

    // Read raw file
    const settingsFile = join(tempDir, ".rad-engineer-integration", "settings.json");
    const rawContent = readFileSync(settingsFile, "utf-8");
    const fileData = JSON.parse(rawContent);

    const iv1 = fileData.profiles[0].apiKey.iv;
    const iv2 = fileData.profiles[1].apiKey.iv;

    // IVs should be different (ensures unique encryption)
    expect(iv1).not.toBe(iv2);
  });

  it("Throws error when decryption fails (simulated tampering)", async () => {
    await handler.addProfile({
      id: "profile-1",
      name: "Test",
      provider: "anthropic",
      apiKey: "sk-ant-test-key",
      isActive: true,
    });

    // Tamper with encrypted data
    const settingsFile = join(tempDir, ".rad-engineer-integration", "settings.json");
    const fileData = JSON.parse(readFileSync(settingsFile, "utf-8"));

    // Corrupt the encrypted data
    fileData.profiles[0].apiKey.encrypted = "tampered-data";

    writeFileSync(settingsFile, JSON.stringify(fileData, null, 2));

    // Create new handler and try to load
    const newHandler = new SettingsAPIHandler({ projectDir: tempDir });

    await expect(newHandler.getSettings()).rejects.toThrow("Failed to decrypt API key");
  });
});

describe("SettingsAPIHandler: Error Handling", () => {
  let handler: SettingsAPIHandler;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-settings-errors");
    await fs.mkdir(tempDir, { recursive: true });

    handler = new SettingsAPIHandler({ projectDir: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("Handles corrupted settings file gracefully", async () => {
    const settingsFile = join(tempDir, ".rad-engineer-integration", "settings.json");
    await fs.mkdir(join(tempDir, ".rad-engineer-integration"), { recursive: true });
    await fs.writeFile(settingsFile, "{ invalid json }", "utf-8");

    await expect(handler.getSettings()).rejects.toThrow("Failed to load settings");
  });
});
