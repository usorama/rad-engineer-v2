import fs from 'fs';
import path from 'path';

describe('i18n locale files - Auto Claude to rad-engineer migration', () => {
  const localesDir = path.join(__dirname, '../src/shared/i18n/locales');
  const languages = ['en', 'fr'];

  // Helper to recursively find all strings in a nested object
  function findAllStrings(obj: any, results: string[] = []): string[] {
    if (typeof obj === 'string') {
      results.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        findAllStrings(value, results);
      }
    }
    return results;
  }

  // Helper to check if a value contains a pattern
  function containsPattern(str: string, pattern: RegExp): boolean {
    return pattern.test(str);
  }

  describe('JSON validity', () => {
    languages.forEach((lang) => {
      describe(`${lang} locale`, () => {
        const langDir = path.join(localesDir, lang);
        const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));

        files.forEach((file) => {
          it(`${file} should have valid JSON syntax`, () => {
            const filePath = path.join(langDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            expect(() => JSON.parse(content)).not.toThrow();
          });
        });
      });
    });
  });

  describe('Auto Claude to rad-engineer migration', () => {
    // Pattern to match "Auto Claude", "Auto-Claude", and "AutoClaude" in values (not keys)
    const autoClaudePattern = /Auto[\s-]?Claude|"[^"]*AutoClaude[^"]*":/g;
    const failedFiles: Array<{ file: string; matches: string[] }> = [];
    const filesWithAutoClaudeInBackup = new Set<string>();

    languages.forEach((lang) => {
      describe(`${lang} locale`, () => {
        const langDir = path.join(localesDir, lang);
        const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));

        files.forEach((file) => {
          it(`${file} should not contain 'Auto Claude' or 'Auto-Claude' in values (keys may contain AutoClaude)`, () => {
            const filePath = path.join(langDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            // Match patterns in values only: "value with Auto Claude" not "key":
            // Strategy: Find all string values and check if they contain the pattern
            const data = JSON.parse(content);
            const allStrings = findAllStrings(data);
            const matches = allStrings.filter((s) => /Auto[\s-]?Claude/.test(s));

            if (matches.length > 0) {
              failedFiles.push({ file: `${lang}/${file}`, matches });
              // Track which backup files should have Auto Claude
              filesWithAutoClaudeInBackup.add(`${lang}/${file}`);
            }

            expect(matches.length).toBe(0);
          });

          it(`${file} should contain 'rad-engineer' references if it had Auto Claude`, () => {
            const filePath = path.join(langDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const allStrings = findAllStrings(data);
            const hasRadEngineer = allStrings.some((s) =>
              s.includes('rad-engineer'),
            );

            // If it had Auto Claude references before (check backup), it should have rad-engineer now
            const backupPath = path.join(langDir, `${file}.bak`);
            if (fs.existsSync(backupPath)) {
              const backupContent = fs.readFileSync(backupPath, 'utf-8');
              const backupData = JSON.parse(backupContent);
              const backupStrings = findAllStrings(backupData);
              const hadAutoClaudeInBackup = backupStrings.some((s) => /Auto[\s-]?Claude/.test(s));

              if (hadAutoClaudeInBackup && !hasRadEngineer) {
                throw new Error(
                  `File was migrated but missing rad-engineer references: ${file}`,
                );
              }
            }
          });
        });
      });
    });

    it('summary: should report any failed files', () => {
      if (failedFiles.length > 0) {
        const summary = failedFiles
          .map((f) => `${f.file}: ${f.matches.join(', ')}`)
          .join('\n');
        throw new Error(
          `Found "Auto Claude" references that were not migrated:\n${summary}`,
        );
      }
    });
  });

  describe('backup files', () => {
    languages.forEach((lang) => {
      const langDir = path.join(localesDir, lang);
      const files = fs.readdirSync(langDir).filter((f) => f.endsWith('.json'));

      files.forEach((file) => {
        it(`${lang}/${file} should have a .bak backup`, () => {
          const backupPath = path.join(langDir, `${file}.bak`);
          expect(fs.existsSync(backupPath)).toBe(true);
        });

        it(`${lang}/${file}.bak should contain original Auto Claude content if file was migrated`, () => {
          const backupPath = path.join(langDir, `${file}.bak`);
          if (fs.existsSync(backupPath)) {
            const backupContent = fs.readFileSync(backupPath, 'utf-8');
            // Check if the backup has Auto Claude references or is identical to original
            const hasAutoClaudeInBackup = /Auto[\s-]?Claude|AutoClaude/.test(backupContent);
            const currentPath = path.join(langDir, file);
            const currentContent = fs.readFileSync(currentPath, 'utf-8');
            // If backup is different from current, it was likely migrated
            const isModified = backupContent !== currentContent;

            // If file was modified (migrated), backup should have had Auto Claude
            // If file was not modified, backup is just a copy and may not have Auto Claude
            if (isModified) {
              expect(hasAutoClaudeInBackup).toBe(true);
            }
          }
        });
      });
    });
  });
});
