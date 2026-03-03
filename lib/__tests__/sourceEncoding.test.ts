import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const filesToCheck = [
  path.join(process.cwd(), 'server.js'),
  path.join(process.cwd(), 'components', 'HomePage.tsx'),
  path.join(process.cwd(), 'lib', 'constants.ts'),
];

const mojibakePatterns = [
  '鎴块',
  '鍒涘缓',
  '鍔犲叆',
  '娓告垙',
  '鏈嶅姟鍣',
  '鐜╁',
  '闂堢偞',
  '杩涜础',
  '鍑嗗',
  '鏈',
];

describe('source encoding hygiene', () => {
  it('does not keep known mojibake fragments in user-facing source files', () => {
    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      for (const fragment of mojibakePatterns) {
        expect(content).not.toContain(fragment);
      }
    }
  });
});
