/**
 * @vitest-environment jsdom
 */
/**
 * GeneralSettings Tests
 *
 * Story 1: Fix Initialization Button Error Feedback
 * Tests error and success toast notifications for initialization button
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../../../../shared/i18n';
import { GeneralSettings } from '../GeneralSettings';
import type {
  Project,
  ProjectSettings as ProjectSettingsType,
  AutoBuildVersionInfo
} from '../../../../shared/types';

// Mock the toast hook
vi.mock('../../../hooks/use-toast', () => ({
  useToast: vi.fn()
}));

import { useToast } from '../../../hooks/use-toast';

describe('GeneralSettings - Initialization Error Feedback', () => {
  const mockToast = vi.fn();
  const mockHandleInitialize = vi.fn();
  const mockSetSettings = vi.fn();

  const mockProject: Project = {
    id: '123',
    name: 'Test Project',
    path: '/test/path',
    addedAt: Date.now(),
    lastOpenedAt: Date.now()
  };

  const mockSettings: ProjectSettingsType = {
    autoCommit: false,
    autoRun: false,
    enableGraphiti: false,
    enableLinear: false,
    apiProvider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929'
  };

  const mockVersionInfo: AutoBuildVersionInfo = {
    localVersion: '1.0.0',
    latestVersion: '1.0.0',
    updateAvailable: false,
    lastChecked: Date.now()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock useToast to return our mock toast function
    (useToast as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      toast: mockToast
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Error toast appears when initialization fails
  it('should display error toast when handleInitialize fails', async () => {
    // Setup: Mock handleInitialize to reject with error
    mockHandleInitialize.mockRejectedValue(new Error('Git not found'));

    const mockError = 'Git not found in project directory';
    const mockSetError = vi.fn();

    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={false}
        handleInitialize={mockHandleInitialize}
        error={mockError}
        setError={mockSetError}
      />
    );

    // Wait for useEffect to trigger
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: expect.stringContaining('Initialization Failed'),
        description: mockError
      });
    });

    // Verify error is cleared after toast
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  // Test 2: Success toast appears when initialization succeeds
  it('should display success toast when initialization succeeds', async () => {
    const mockSuccess = true;

    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={false}
        handleInitialize={mockHandleInitialize}
        success={mockSuccess}
        setSuccess={vi.fn()}
      />
    );

    // Wait for useEffect to trigger
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: expect.stringContaining('Initialized'),
        description: expect.stringContaining('successfully initialized')
      });
    });
  });

  // Test 3: Error is cleared after toast displays
  it('should clear error after displaying toast', async () => {
    const mockError = 'Test error';
    const mockSetError = vi.fn();

    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={false}
        handleInitialize={mockHandleInitialize}
        error={mockError}
        setError={mockSetError}
      />
    );

    // Wait for useEffect to complete
    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    // Verify toast was called before clearing
    expect(mockToast).toHaveBeenCalledBefore(mockSetError);
  });

  // Test 4: Button loading state works correctly
  it('should disable button and show loading text when isUpdating is true', () => {
    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={true}
        handleInitialize={mockHandleInitialize}
      />
    );

    // Find the initialize button
    const button = screen.getByRole('button', { name: /initializing/i });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/initializing/i);
  });

  // Test 5: Button is enabled when not updating
  it('should enable button and show initialize text when isUpdating is false', () => {
    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={false}
        handleInitialize={mockHandleInitialize}
      />
    );

    // Find the initialize button
    const button = screen.getByRole('button', { name: /initialize/i });

    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/initialize/i);
  });

  // Test 6: Toast uses correct i18n keys
  it('should use i18n keys for toast messages', async () => {
    const mockError = 'Test error';
    const mockSetError = vi.fn();

    render(
      <GeneralSettings
        project={mockProject}
        settings={mockSettings}
        setSettings={mockSetSettings}
        versionInfo={mockVersionInfo}
        isCheckingVersion={false}
        isUpdating={false}
        handleInitialize={mockHandleInitialize}
        error={mockError}
        setError={mockSetError}
      />
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          description: mockError
        })
      );
    });
  });
});
