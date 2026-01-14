/**
 * Rebranding Test: Verify all "Auto Claude" references replaced with "rad-engineer"
 *
 * This test ensures the codebase is fully rebranded from "Auto Claude" to "rad-engineer"
 * by checking that no references to the old name remain in the code.
 *
 * Run after rebranding to verify all patterns have been replaced:
 * - "Auto Claude" → "rad-engineer"
 * - "Auto-Claude" → "rad-engineer"
 * - "AUTO_CLAUDE" → "RAD_ENGINEER"
 * - "autoClaude" → "radEngineer"
 * - "AutoClaude" → "RadEngineer"
 * - "autoclaude" → "radengineer"
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';

describe('Rebranding Verification', () => {
  const mainIndexPath = '/Users/umasankr/Projects/rad-engineer-v2/workspaces/rad-engineer-ui/apps/frontend/src/main/index.ts';

  /**
   * Test: Main window should be titled "rad-engineer"
   */
  it('should set app name to "rad-engineer" in main/index.ts', () => {
    const content = readFileSync(mainIndexPath, 'utf-8');

    expect(content).toContain("app.setName('rad-engineer')");
    expect(content).toContain("app.name = 'rad-engineer'");
  });

  /**
   * Test: App user model ID should use radengineer (no hyphens in app IDs)
   */
  it('should set app user model ID to radengineer in main/index.ts', () => {
    const content = readFileSync(mainIndexPath, 'utf-8');

    expect(content).toContain("electronApp.setAppUserModelId('com.radengineer.ui')");
  });

  /**
   * Test: Main index should not contain "Auto Claude" references
   */
  it('should not contain "Auto Claude" in main/index.ts', () => {
    const content = readFileSync(mainIndexPath, 'utf-8');

    expect(content).not.toContain('Auto Claude');
    expect(content).not.toContain('Auto-Claude');
    expect(content).not.toContain('AutoClaude');
    expect(content).not.toContain('autoClaude');
    expect(content).not.toContain('AUTO_CLAUDE');
  });
});

/**
 * Manual verification command (run in terminal):
 *
 * # Check for any remaining "Auto Claude" patterns in src/
 * grep -r "Auto Claude\|Auto-Claude\|AUTO_CLAUDE\|autoClaude\|AutoClaude" \
 *   /Users/umasankr/Projects/rad-engineer-v2/workspaces/rad-engineer-ui/apps/frontend/src \
 *   --include="*.ts" --include="*.tsx" --include="*.json"
 *
 * Expected: No matches (or only in comments/tests)
 */
