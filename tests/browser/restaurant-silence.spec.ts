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

test.use({ launchOptions: { args: micArgs(silence) }, permissions: ['microphone'] });

test('silence triggers the 8s, 16s and 24s reactions and does not move the story', async ({ page }) => {
  // Real time, not a fake clock: the reactions are checked against the actual 8/16/24 s schedule.
  test.setTimeout(150_000);
  await allowMicrophone(page);
  await openRestaurant(page);
  // Wait for Mithu's opening to finish, so the silence clock is running.
  await expect(page.locator('.rv-mic')).toContainText('তোমার কথার অপেক্ষায়', { timeout: 60_000 });
  const started = Date.now();

  await expect(page.locator('.rv-log')).toContainText('আমি কী করব', { timeout: 30_000 });
  const worriedAt = (Date.now() - started) / 1000;

  await expect(page.locator('.rv-log')).toContainText('ভাত বা মাছ দিতে পারো', { timeout: 40_000 });
  const hintAt = (Date.now() - started) / 1000;

  await expect(page.locator('.rv-log')).toContainText('ভাত, মাছ নাকি পিৎজা', { timeout: 40_000 });
  const choiceAt = (Date.now() - started) / 1000;

  // The reactions come in order and not before their times (allowing for playback).
  expect(worriedAt).toBeGreaterThanOrEqual(7);
  expect(hintAt).toBeGreaterThanOrEqual(15);
  expect(choiceAt).toBeGreaterThanOrEqual(23);
  console.log(`silence reactions observed at ~${worriedAt.toFixed(1)}s, ~${hintAt.toFixed(1)}s, ~${choiceAt.toFixed(1)}s`);

  // Silence never serves a dish, so the story did not move.
  await expect(page.getByTestId('rv-served')).toHaveCount(0);
  await expect(page.locator('.rv-log')).not.toContainText('তুমি:');
});
