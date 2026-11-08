# Detail navigation overlap regression

The released detail page used a fixed, left-aligned back/share/top stack. At a
390 × 844 CSS viewport, scrolling made its 164px stack cover ingredient/analysis
content. Its bottom offset assumed a 64px bottom navigation bar, although the
detail route hides that bar. The separate product action bar remains fixed.

The fix moves only the existing quick-navigation group after the final review
section in normal wrapping flow. Header back/share, handlers, product actions,
score calculation, and guest login behavior remain unchanged.

`Detail.navigation.test.tsx` checks placement and the existing back/share/top and
guest log handlers. The isolated browser fixture renders the actual Detail,
Layout and styles with synthetic product/rating reads, a guest store and a share
adapter. It rejects unexpected transport and never uses production connections,
credentials, accounts or product data.

On Linux after the repository's existing `npm ci`:

```sh
npx tsc -p tests/detail-layout/tsconfig.json
npx playwright install --with-deps chromium
node tests/detail-layout/run.mjs
```

The dedicated read-only-permission CI runs this fixture. Existing release CI
continues to run all unit tests, lint, build and audit without any exception or
threshold change. No package or lockfile change is needed.

Browser cases cover 360, 390, 430 and 1280px, plus a 640px/2×-DPR reflow
equivalent for a 1280px display at 200%. Each case uses both zero and a simulated
34px footer inset, checks middle/end content geometry and horizontal overflow,
then exercises share, keyboard focus/top/back and guest login navigation.
Screenshots and measurements are CI artifacts, not committed operating data.

Limits: these are synthetic Chromium responses and fallback fonts, not operating
HTTP/authentication tests. Simulated inset and reflow do not certify real iOS
safe-area, Safari, OS browser zoom or mobile pinch zoom. Actual Preview checks
are recorded separately in the PR. No operating write is needed.
