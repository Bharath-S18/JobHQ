import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export const BROWSER_PROFILE_DIR = path.resolve("./data/browser_profile");
fs.mkdirSync(BROWSER_PROFILE_DIR, { recursive: true });

let managedBrowser = null;

export function cleanupStaleLocks() {
  try {
    const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie", "lockfile", "DevToolsActivePort"];
    for (const file of lockFiles) {
      const lockPath = path.join(BROWSER_PROFILE_DIR, file);
      if (fs.existsSync(lockPath)) {
        try {
          fs.unlinkSync(lockPath);
        } catch (e) {}
      }
    }
  } catch (e) {}
}

export async function getOrLaunchBrowser({ headless = false } = {}) {
  // 1. If we already have a live browser instance, reuse it!
  if (managedBrowser) {
    try {
      if (managedBrowser.isConnected()) {
        return managedBrowser;
      }
    } catch (e) {
      managedBrowser = null;
    }
  }

  // 2. Clear stale lock files from previous crashes
  cleanupStaleLocks();

  try {
    managedBrowser = await puppeteer.launch({
      headless: headless ? "new" : false,
      userDataDir: BROWSER_PROFILE_DIR,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--start-maximized",
      ],
    });
  } catch (err) {
    // If locked by a previous process, try cleanup and fallback to isolated session or fresh launch
    console.warn("[Browser Manager] Initial launch warning:", err.message, "Retrying with lock cleanup...");
    cleanupStaleLocks();
    
    managedBrowser = await puppeteer.launch({
      headless: headless ? "new" : false,
      userDataDir: BROWSER_PROFILE_DIR,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }

  managedBrowser.on("disconnected", () => {
    console.log("[Browser Manager] Browser session disconnected.");
    managedBrowser = null;
  });

  return managedBrowser;
}

export async function launchUserLoginWindow() {
  try {
    console.log("[Hunter Browser] Opening dedicated visible Chrome window for LinkedIn login...");
    const browser = await getOrLaunchBrowser({ headless: false });
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
    await page.bringToFront();

    return {
      success: true,
      message: "Visible Chrome window is open. Please sign in to LinkedIn on your screen.",
    };
  } catch (err) {
    console.error("[Hunter Browser Login Error]:", err.message);
    return {
      success: false,
      error: `Could not open browser window: ${err.message}`,
    };
  }
}

export async function checkLinkedInSession() {
  if (!managedBrowser || !managedBrowser.isConnected()) {
    return {
      authenticated: false,
      status: "BROWSER_NOT_OPEN",
      message: "Click 'Open LinkedIn Window' to start your local browser session.",
    };
  }

  let testPage = null;
  try {
    testPage = await managedBrowser.newPage();
    await testPage.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 15000 });
    const currentUrl = testPage.url();

    const isLoggedIn = !currentUrl.includes("/login") && !currentUrl.includes("/authwall") && !currentUrl.includes("/checkpoint/");
    await testPage.close();

    return {
      authenticated: isLoggedIn,
      status: isLoggedIn ? "AUTHENTICATED" : "NOT_AUTHENTICATED",
      url: currentUrl,
    };
  } catch (err) {
    if (testPage) {
      try { await testPage.close(); } catch (e) {}
    }
    return {
      authenticated: false,
      status: "ERROR",
      error: err.message,
    };
  }
}

export async function closeManagedBrowser() {
  if (managedBrowser) {
    try {
      await managedBrowser.close();
    } catch (e) {}
    managedBrowser = null;
  }
  cleanupStaleLocks();
  return { success: true, message: "Browser closed." };
}
