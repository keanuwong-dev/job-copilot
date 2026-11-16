import { detectAdapter, genericAdapter, isAutoAdapter } from '../src/adapters';
import { isBlockedPage } from '../src/sites';
import { mountWidget } from '../src/widget';

const globalState = globalThis as { __jobTrackerContent?: boolean };

export default defineContentScript({
  matches: [
    '*://boards.greenhouse.io/*',
    '*://job-boards.greenhouse.io/*',
    '*://*.grnh.se/*',
    '*://jobs.lever.co/*/apply*',
    '*://jobs.ashbyhq.com/*',
    '*://*.myworkdayjobs.com/*',
  ],
  allFrames: true,
  main() {
    if (globalState.__jobTrackerContent) return;
    globalState.__jobTrackerContent = true;

    browser.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
      if (message?.type === 'ping') {
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === 'mount-generic') {
        if (isBlockedPage(location.href)) {
          sendResponse({ ok: false, error: 'LinkedIn and Indeed are not supported' });
          return true;
        }
        if (!document.documentElement.dataset.jobTracker) {
          const detected = detectAdapter(new URL(location.href), document);
          const adapter = detected && isAutoAdapter(detected) ? detected : genericAdapter;
          mountWidget(adapter);
        }
        sendResponse({ ok: true });
        return true;
      }
      return undefined;
    });

    const adapter = detectAdapter(new URL(location.href), document);
    if (!adapter || !isAutoAdapter(adapter)) return;
    void browser.runtime.sendMessage({ type: 'bundle' }).then((bundle) => {
      if (!bundle?.ok) return;
      const enabled = bundle.settings?.platforms?.[adapter.id] !== false;
      if (!enabled || document.documentElement.dataset.jobTracker) return;
      mountWidget(adapter);
    });
  },
});
