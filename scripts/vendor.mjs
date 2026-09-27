#!/usr/bin/env node
// Copies the browser builds of pdf-lib and fontkit from node_modules into
// vendor/, so the site runs as plain static files (no bundler, no CDN).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nm = (...p) => path.join(root, 'node_modules', ...p);
const out = path.join(root, 'vendor');
fs.mkdirSync(out, { recursive: true });

const files = [
  [nm('pdf-lib', 'dist', 'pdf-lib.esm.min.js'), 'pdf-lib.esm.min.js'],
  [nm('pdf-lib', 'LICENSE.md'), 'pdf-lib.LICENSE.md'],
  [nm('@pdf-lib', 'fontkit', 'dist', 'fontkit.umd.min.js'), 'fontkit.umd.min.js'],
];
const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
// @pdf-lib/fontkit ships without a LICENSE file; its package.json declares MIT.
fs.writeFileSync(
  path.join(out, 'fontkit.LICENSE'),
  `@pdf-lib/fontkit (fork of fontkit) – MIT License\n\nCopyright (c) Devon Govett (fontkit)\nCopyright (c) Andrew Dillon (@pdf-lib/fontkit)\n\n${MIT}`,
);
console.log('vendor/fontkit.LICENSE');
for (const [src, name] of files) {
  let data = fs.readFileSync(src, 'utf8');
  if (name.endsWith('.js')) data = data.replace(/\n?\/\/# sourceMappingURL=.*$/m, ''); // no .map files shipped
  fs.writeFileSync(path.join(out, name), data);
  console.log('vendor/' + name);
}
fs.writeFileSync(
  path.join(out, 'fontkit.js'),
  '// ES module wrapper around the UMD build loaded by index.html (window.fontkit).\nexport default globalThis.fontkit;\n',
);
console.log('vendor/fontkit.js');
