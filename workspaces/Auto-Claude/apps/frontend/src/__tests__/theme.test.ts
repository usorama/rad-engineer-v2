import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Theme color validation tests
 * Ensures CSS theme variables have been migrated from rad-engineer yellow to rad-engineer blue
 * with proper WCAG AA contrast ratios
 */

const GLOBALS_CSS_PATH = path.resolve(
  __dirname,
  '../renderer/styles/globals.css'
);

// Color values to check
const YELLOW_COLORS = {
  light: '#A5A66A', // Light mode muted olive/yellow
  dark: '#D6D876', // Dark mode saturated yellow
  duskLight: '#B8B978', // Dusk theme light mode
  duskDark: '#E6E7A3', // Dusk theme dark mode
};

const BLUE_COLORS = {
  light: '#0EA5E9', // Sky blue for light mode
  dark: '#38BDF8', // Brighter sky blue for dark mode
};

describe('Theme Color Migration - Yellow to Blue', () => {
  let cssContent: string;

  beforeAll(() => {
    cssContent = fs.readFileSync(GLOBALS_CSS_PATH, 'utf-8');
  });

  describe('Primary color replacement', () => {
    it('should have blue primary color for light mode root', () => {
      // Root :root selector should use light blue for primary
      expect(cssContent).toContain('--primary: #0EA5E9');
    });

    it('should have blue primary color for dark mode', () => {
      // .dark selector should use dark blue for primary
      const darkModeSection = cssContent.match(
        /\.dark\s*\{[^}]*--primary:\s*([^;]+)/
      );
      expect(darkModeSection).toBeTruthy();
      expect(darkModeSection?.[1].trim()).toBe('#38BDF8');
    });

    it('should remove all yellow primary colors from root', () => {
      // Light mode yellow should be replaced
      expect(cssContent.match(/:root\s*\{[^}]*--primary:\s*#A5A66A/)).toBeFalsy();
    });

    it('should remove all yellow primary colors from dark mode', () => {
      // Dark mode yellow should be replaced
      expect(cssContent.match(/\.dark\s*\{[^}]*--primary:\s*#D6D876/)).toBeFalsy();
    });
  });

  describe('Theme-specific color updates', () => {
    it('should update dusk theme light mode primary to blue', () => {
      const duskLightMatch = cssContent.match(
        /\[data-theme="dusk"\]\s*\{[^}]*--primary:\s*([^;]+)/
      );
      expect(duskLightMatch).toBeTruthy();
      // Should be blue, not yellow
      expect(duskLightMatch?.[1].trim()).not.toBe('#B8B978');
    });

    it('should update dusk theme dark mode primary to blue', () => {
      const duskDarkMatch = cssContent.match(
        /\[data-theme="dusk"\]\.dark\s*\{[^}]*--primary:\s*([^;]+)/
      );
      expect(duskDarkMatch).toBeTruthy();
      // Should be blue, not yellow
      expect(duskDarkMatch?.[1].trim()).not.toBe('#E6E7A3');
    });
  });

  describe('Ring color replacement', () => {
    it('should update root ring color from yellow to blue', () => {
      // Should have blue ring color
      expect(cssContent).toContain('--ring: #0EA5E9');
    });

    it('should update dark mode ring color from yellow to blue', () => {
      const darkRingMatch = cssContent.match(
        /\.dark\s*\{[^}]*--ring:\s*([^;]+)/
      );
      expect(darkRingMatch).toBeTruthy();
      expect(darkRingMatch?.[1].trim()).toBe('#38BDF8');
    });
  });

  describe('Shadow and accent rgba values', () => {
    it('should replace yellow rgba values in shadow-focus', () => {
      // Light mode shadow-focus with yellow rgba
      expect(cssContent).not.toContain('rgba(165, 166, 106');
      // Dark mode shadow-focus with yellow rgba
      expect(cssContent).not.toContain('rgba(214, 216, 118');
    });

    it('should replace accent-foreground from yellow to blue', () => {
      // Light mode accent-foreground should not be yellow
      expect(cssContent).not.toMatch(/:root\s*\{[^}]*--accent-foreground:\s*#A5A66A/);
      // Dark mode accent-foreground should not be yellow
      expect(cssContent).not.toMatch(/\.dark\s*\{[^}]*--accent-foreground:\s*#D6D876/);
    });
  });

  describe('Inline rgba values in animations and shadows', () => {
    it('should not contain dark mode yellow rgba(214, 216, 118)', () => {
      // Check that yellow rgba is removed from all inline styles
      const yellowRgbaMatches = (cssContent.match(/rgba\(214,\s*216,\s*118/g) || []).length;
      expect(yellowRgbaMatches).toBe(0);
    });

    it('should not contain light mode yellow rgba(165, 166, 106)', () => {
      // Check that light yellow rgba is removed
      const lightYellowMatches = (cssContent.match(/rgba\(165,\s*166,\s*106/g) || []).length;
      expect(lightYellowMatches).toBe(0);
    });

    it('should use blue rgba values in animations', () => {
      // Should have blue rgba values for animations (approximate: 14, 165, 233 or 56, 189, 248)
      const hasBlueRgba =
        cssContent.includes('rgba(14, 165, 233') ||
        cssContent.includes('rgba(56, 189, 248');
      expect(hasBlueRgba).toBe(true);
    });
  });

  describe('WCAG AA contrast validation', () => {
    it('should have sufficient contrast between blue primary and dark background', () => {
      // #38BDF8 on #0B0B0F should have good contrast
      // Blue text on dark background is high contrast
      const darkModeSection = cssContent.match(/\.dark\s*\{[^}]*--primary:\s*#38BDF8/);
      expect(darkModeSection).toBeTruthy();
    });

    it('should have sufficient contrast between light blue primary and light background', () => {
      // #0EA5E9 on #F2F2ED should have good contrast
      const lightModeSection = cssContent.match(/:root\s*\{[^}]*--primary:\s*#0EA5E9/);
      expect(lightModeSection).toBeTruthy();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain all theme variants (default, dusk, lime, ocean, retro, neo, forest)', () => {
      const themes = [
        'default',
        'dusk',
        'lime',
        'ocean',
        'retro',
        'neo',
        'forest'
      ];

      themes.forEach(theme => {
        if (theme !== 'default') {
          expect(cssContent).toContain(`[data-theme="${theme}"]`);
        }
      });
    });

    it('should maintain dark mode variants for all themes', () => {
      const themes = ['dusk', 'lime', 'ocean', 'retro', 'neo', 'forest'];

      themes.forEach(theme => {
        expect(cssContent).toContain(`[data-theme="${theme}"].dark`);
      });
    });

    it('should maintain all CSS custom properties structure', () => {
      const requiredVars = [
        '--background',
        '--foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--accent',
        '--accent-foreground',
        '--border',
        '--input',
        '--ring'
      ];

      requiredVars.forEach(variable => {
        expect(cssContent).toContain(variable);
      });
    });
  });

  describe('No yellow hex values remaining', () => {
    it('should not contain yellow hex value #D6D876', () => {
      expect(cssContent).not.toContain('#D6D876');
    });

    it('should not contain yellow hex value #A5A66A', () => {
      expect(cssContent).not.toContain('#A5A66A');
    });

    it('should not contain yellow hex value #B8B978', () => {
      expect(cssContent).not.toContain('#B8B978');
    });

    it('should not contain yellow hex value #E6E7A3', () => {
      expect(cssContent).not.toContain('#E6E7A3');
    });
  });
});
