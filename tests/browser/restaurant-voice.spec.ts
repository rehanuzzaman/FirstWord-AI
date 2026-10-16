import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fake microphone files are generated once by tests/browser/fixtures/make-audio.py.
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const bhat = path.join(fixtures, 'bhat.wav'); // "ভাত দাও" (Edge TTS, synthetic voice)
const silence = path.join(fixtures, 'silence.wav'); // 30 s of silence

test.beforeAll(() => {
  if (!existsSync(bhat) || !existsSync(silence)) {
    execFileSync('python3', [path.join(fixtures, 'make-audio.py')], { stdio: 'inherit' });
  }
});

function micArgs(file: string) {
  return [
    '--enable-unsafe-swiftshader',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${file}`,
  ];
}

async function allowMicrophone(page: Page) {
  // Guardian consent for this local profile, as the parent area would set it.
  const r = await page.request.patch('/api/profile', { data: { consent: true, microphone: true } });
  expect(r.status()).toBe(200);
}

async function openRestaurant(page: Page) {
  await page.goto('/');
  await expect(page.locator('.game-loading')).toHaveCount(0);
  await page.getByRole('button', { name: /রেস্টুরেন্ট খেলো/u }).click();
  await page.getByRole('button', { name: 'শুরু করো' }).click();
}

test.use({ launchOptions: { args: micArgs(bhat) }, permissions: ['microphone'] });

test('restaurant can be completed with voice input only', async ({ page }) => {
  test.setTimeout(170_000);
  await allowMicrophone(page);
  // The only taps are "খেলো" and "শুরু করো". After that the child speaks.
  await openRestaurant(page);
  await expect(page.locator('.rv-mic')).toContainText('মাইক চালু');
  // Groq Whisper hears the phrase, the brain serves a dish, and the screen shows it.
  await expect(page.getByTestId('rv-served')).toContainText('ভাত', { timeout: 150_000 });
  await expect(page.locator('.rv-log')).toContainText('তুমি:');
  await expect(page.locator('.rv-meta')).toContainText('উত্তর');
});
