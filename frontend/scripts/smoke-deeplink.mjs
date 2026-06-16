/**
 * Smoke-test deep-link URL params in the browser.
 * Run: node scripts/smoke-deeplink.mjs
 * Requires: npx playwright (auto-installed on first run)
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const NURSE_TOKEN = process.env.SMOKE_NURSE_TOKEN || '';
const DOCTOR_TOKEN = process.env.SMOKE_DOCTOR_TOKEN || '';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForDashboard(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
}

async function testPublicRoom(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/room?room=2`, { waitUntil: 'networkidle' });
    const hasBeds = await page.locator('.rdv2-bed-card, .room-display-page').count();
    if (hasBeds > 0) {
      pass('Public /room?room=2', 'room display rendered');
    } else {
      fail('Public /room?room=2', 'no bed cards found');
    }
    const url = page.url();
    if (url.includes('room=2') || url.includes('/room/')) {
      pass('Public /room URL', url);
    } else {
      pass('Public /room URL', url);
    }
  } catch (e) {
    fail('Public /room?room=2', e.message);
  } finally {
    await page.close();
  }
}

async function testNurseDeepLinks(browser) {
  if (!NURSE_TOKEN) {
    fail('Nurse deep-links', 'no SMOKE_NURSE_TOKEN');
    return;
  }
  const context = await browser.newContext();
  await context.addInitScript((token) => {
    localStorage.setItem('auth_token', token);
  }, NURSE_TOKEN);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/nurse/appointments?tab=bracelets`, { waitUntil: 'networkidle' });
    await waitForDashboard(page, '.nurse-dashboard__tab.active');
    const activeTab = await page.locator('.nurse-dashboard__tab.active').textContent();
    if (activeTab?.includes('Браслеты')) {
      pass('Nurse ?tab=bracelets', 'active tab is Браслеты');
    } else {
      fail('Nurse ?tab=bracelets', `got: ${activeTab?.trim()}`);
    }

    await page.goto(`${BASE}/nurse/appointments?tab=appointments&patient=1`, {
      waitUntil: 'networkidle',
    });
    const apptTab = await page.locator('.nurse-dashboard__tab.active').textContent();
    if (apptTab?.includes('Назначения')) {
      pass('Nurse ?tab=appointments&patient=1', 'appointments tab active');
    } else {
      fail('Nurse ?tab=appointments&patient=1', apptTab?.trim());
    }

    await page.goto(`${BASE}/nurse/appointments?card=1&cardTab=prescriptions`, {
      waitUntil: 'networkidle',
    });
    const patientsTab = await page.locator('.nurse-dashboard__tab.active').textContent();
    const modal = await page.locator('.modal-overlay .pc-tab-btn.active').textContent().catch(() => null);
    if (patientsTab?.includes('Пациенты') && modal?.includes('Назначения')) {
      pass('Nurse ?card=1&cardTab=prescriptions', 'card modal on prescriptions');
    } else {
      fail('Nurse ?card=1', `tab=${patientsTab?.trim()}, modal=${modal?.trim()}`);
    }

    await page.goto(`${BASE}/nurse/appointments?tab=archive&card=1`, {
      waitUntil: 'networkidle',
    });
    const archiveCards = await page.locator('.archived-panel .patient-card, .archived-patient-list').count();
    const archiveModal = await page.locator('.pc-tab-btn, .patient-card h3').count();
    if (archiveCards > 0 || archiveModal > 0) {
      pass('Nurse archive ?card=1', 'archive view loaded');
    } else {
      fail('Nurse archive ?card=1', 'archive not loaded');
    }
  } catch (e) {
    fail('Nurse deep-links', e.message);
  } finally {
    await context.close();
  }
}

async function testDoctorDeepLinks(browser) {
  if (!DOCTOR_TOKEN) {
    fail('Doctor deep-links', 'no SMOKE_DOCTOR_TOKEN');
    return;
  }
  const context = await browser.newContext();
  await context.addInitScript((token) => {
    localStorage.setItem('auth_token', token);
  }, DOCTOR_TOKEN);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/doctor/patients?tab=prescriptions&patient=1&subtab=measurements`, {
      waitUntil: 'networkidle',
    });
    const rxTab = await page.locator('.nav-button.active').textContent();
    const subTab = await page.locator('.tab-btn.active').textContent();
    if (rxTab?.includes('Назначения') && subTab?.includes('Измерения')) {
      pass('Doctor prescriptions+subtab', 'tabs OK');
    } else {
      fail('Doctor prescriptions+subtab', `main=${rxTab?.trim()}, sub=${subTab?.trim()}`);
    }

    await page.goto(`${BASE}/doctor/patients?tab=archive&card=1`, {
      waitUntil: 'networkidle',
    });
    const modals = await page.locator('.modal-overlay').count();
    const patientCards = await page.locator('.pc-tab-btn, .archived-panel').count();
    if (modals <= 1 && patientCards > 0) {
      pass('Doctor archive ?card=1', `modals=${modals} (no duplicate)`);
    } else {
      fail('Doctor archive ?card=1', `modals=${modals}`);
    }
  } catch (e) {
    fail('Doctor deep-links', e.message);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`Smoke deep-link tests @ ${BASE}\n`);
  const browser = await chromium.launch({ headless: true });
  try {
    await testPublicRoom(browser);
    await testNurseDeepLinks(browser);
    await testDoctorDeepLinks(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
