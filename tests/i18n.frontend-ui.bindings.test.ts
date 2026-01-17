import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readWorkspaceFile(...parts: string[]) {
  const filePath = path.join(process.cwd(), ...parts);
  return fs.readFileSync(filePath, 'utf8');
}

function expectElementHasAttrs(html: string, tag: string, attrs: Array<{ name: string; value: string }>) {
  const lookaheads = attrs
    .map((a) => `(?=[^>]*\\b${a.name}="${a.value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}")`)
    .join('');
  const re = new RegExp(`<${tag}${lookaheads}[^>]*>`, 'i');
  expect(html).toMatch(re);
}

describe('Sprint 59.8 — Frontend UI bindings anti-regressione', () => {
  it('odessa_main.html: elementi core sono legati a chiavi i18n (data-i18n/placeholder/aria/alt)', () => {
    const html = readWorkspaceFile('web', 'odessa_main.html');

    expect(html).toMatch(/<script\s+src="js\/i18n\.js"/i);

    expectElementHasAttrs(html, 'label', [
      { name: 'for', value: 'userInput' },
      { name: 'data-i18n', value: 'ui.label.command' },
    ]);

    expectElementHasAttrs(html, 'input', [
      { name: 'id', value: 'userInput' },
      { name: 'data-i18n-placeholder', value: 'ui.input.placeholder' },
    ]);

    expectElementHasAttrs(html, 'button', [
      { name: 'id', value: 'sendBtn' },
      { name: 'data-i18n', value: 'ui.button.submit' },
    ]);

    expectElementHasAttrs(html, 'section', [{ name: 'data-i18n-aria-label', value: 'ui.aria.placesSection' }]);
    expectElementHasAttrs(html, 'section', [{ name: 'data-i18n-aria-label', value: 'ui.aria.consoleSection' }]);
    expectElementHasAttrs(html, 'div', [{ name: 'data-i18n-aria-label', value: 'ui.aria.outputWrapper' }]);
    expectElementHasAttrs(html, 'div', [{ name: 'data-i18n-aria-label', value: 'ui.aria.outputDescription' }]);

    expectElementHasAttrs(html, 'img', [
      { name: 'id', value: 'dynamicPlaceImage' },
      { name: 'data-i18n-alt', value: 'ui.image.place.alt' },
    ]);
  });

  it('odessa_storia.html: link esterni e PDF hanno data-i18n (evita regressioni hardcoded)', () => {
    const html = readWorkspaceFile('web', 'odessa_storia.html');

    expect(html).toMatch(/<script\s+src="js\/i18n\.js"/i);

    expect(html).toMatch(/data-i18n="story\.link\.ready64"/);
    expect(html).toMatch(/data-i18n="story\.link\.englishVersion"/);
    expect(html).toMatch(/data-i18n="story\.link\.playOnline"/);

    expect(html).toMatch(/data-i18n="story\.pdf\.brochure"/);
    expect(html).toMatch(/data-i18n="story\.pdf\.solutionMap"/);
    expect(html).toMatch(/data-i18n="story\.pdf\.instructions"/);
  });
});
