import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Branding Configuration - rad-engineer rebranding', () => {
  const rootDir = path.join(__dirname, '..');
  const projectRoot = path.join(__dirname, '../../..');

  describe('package.json files', () => {
    it('root package.json should have rad-engineer branding', () => {
      const packagePath = path.join(projectRoot, 'package.json');
      const content = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      expect(content.name).toBe('rad-engineer');
      expect(content.description).toContain('Autonomous engineering platform');
    });

    it('frontend package.json should have rad-engineer branding', () => {
      const packagePath = path.join(rootDir, 'package.json');
      const content = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      expect(content.name).toBe('rad-engineer-ui');
      expect(content.description).toContain('Autonomous engineering platform');
      expect(content.build?.appId).toBe('com.radengineer.app');
      expect(content.build?.productName).toBe('rad-engineer');
    });
  });

  describe('HTML files', () => {
    it('index.html should have rad-engineer title', () => {
      const htmlPath = path.join(rootDir, 'src/renderer/index.html');
      const content = fs.readFileSync(htmlPath, 'utf-8');

      expect(content).toContain('<title>rad-engineer</title>');
      expect(content).not.toContain('Auto Claude');
    });
  });

  describe('No auto-claude references remaining', () => {
    it('package.json files should not contain auto-claude', () => {
      const files = [
        path.join(projectRoot, 'package.json'),
        path.join(rootDir, 'package.json'),
      ];

      files.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).not.toContain('auto-claude');
        expect(content).not.toMatch(/autoclaude/i);
      });
    });

    it('HTML files should not contain Auto Claude references', () => {
      const htmlPath = path.join(rootDir, 'src/renderer/index.html');
      const content = fs.readFileSync(htmlPath, 'utf-8');

      expect(content).not.toContain('Auto Claude');
      expect(content).not.toContain('auto-claude');
    });
  });
});
