# MediQue Frontend Production Readiness Audit — UX/UI, Resilience, Accessibility

## Phase 1: Planning

Audit strategy executed:
1. Trace patient and doctor happy paths through React views and `queueService` transport layer.
2. Identify crash vectors (missing boundaries, unchecked async failures, undefined data assumptions).
3. Evaluate behavior under network failure, API latency, and high-volume queues.
4. Audit rendering safety (XSS), input sanitization, and accessibility gaps.

## Phase 2: Deep Dive Trace Notes

- Traced patient check-in flow: `components/PatientForm.tsx` -> `queueService.checkIn` -> API POST.
- Traced doctor flow: `pages/DoctorDashboard.tsx` -> `queueService.updateStatus` transition chain.
- Traced passive display flow: `pages/TVDisplay.tsx` polling + subscription behavior under disconnect.
- Traced crash behavior from app root (`index.tsx`) with no error boundary wrapping.

---

## Findings

### 1) High: No global Error Boundary; single component crash can white-screen app
- **Severity:** High
- **Location:** `index.tsx:8-15`
- **Violation:** React production resilience pattern violation. Any render-time exception (e.g., malformed stats in chart) can unmount the tree.
- **Fix:** Wrap app with top-level error boundary and route-level fallbacks.

```tsx
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
```

### 2) High: `QueueGraph` assumes complete stats object and can crash on partial data
- **Severity:** High
- **Location:** `components/QueueGraph.tsx:23`
- **Violation:** Direct dereference `stats[dept.id].waiting` without guard violates defensive UI pattern; undefined causes runtime exception.
- **Fix:** Add null-safe defaults before render.

```tsx
const stat = stats[dept.id] ?? { waiting: 0, completed: 0, urgentCount: 0, avgWaitTime: 0 };
```

### 3) High: No request timeout/abort handling for check-in path
- **Severity:** High
- **Location:** `services/queueService.ts:146`, `components/PatientForm.tsx:83`
- **Violation:** If API hangs, UI remains in ambiguous state until browser-level timeout. This breaks critical patient check-in UX.
- **Fix:** Use `AbortController` with explicit timeout and show retry-capable inline error state.

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 8000);
await fetch(url, { method: 'POST', body, signal: controller.signal });
```

### 4) Medium: Empty/invalid submit exits silently without user feedback
- **Severity:** Medium
- **Location:** `components/PatientForm.tsx:68-69`
- **Violation:** `if (!name || !age) return;` fails silently. Users receive no actionable guidance.
- **Fix:** Add explicit validation errors for each field and render them in-form.

### 5) Medium: Error handling relies on blocking `alert()` dialogs
- **Severity:** Medium
- **Location:** `components/PatientForm.tsx:83`, `pages/ReceptionView.tsx:31`, `pages/AdminDashboard.tsx:50`
- **Violation:** Blocking dialogs are poor UX, inaccessible in some environments, and non-observable for analytics.
- **Fix:** Replace with non-blocking toast/banner + retry CTA.

### 6) High: Doctor dashboard async updates can fail unhandled
- **Severity:** High
- **Location:** `pages/DoctorDashboard.tsx:40-42`
- **Violation:** `void update()` ignores rejected promises; transient network failures can desync UI state with no user feedback.
- **Fix:** Wrap `update` calls in guarded error handling with stale-data indicator.

```ts
try { await update(); } catch { setLoadError('Live queue unavailable. Retrying...'); }
```

### 7) High: Poor scalability at 10,000 patients (no virtualization/pagination)
- **Severity:** High
- **Location:** `pages/DoctorDashboard.tsx:118,241`; `pages/TVDisplay.tsx:13,17,22`
- **Violation:** Full-array filter/map render on every refresh, plus `refreshAllDepartments` every 5s in TV mode. This will degrade sharply with large queues.
- **Fix:**
  - Implement server-side paging/window endpoints (e.g., `?state=WAITING&limit=100`).
  - Use list virtualization (`react-window`) for large queues.
  - Restrict TV payload to top N active/waiting tokens only.

### 8) Medium: TV display disconnect recovery is weak and can silently stale
- **Severity:** Medium
- **Location:** `services/queueService.ts:344-347`, `pages/TVDisplay.tsx:37`
- **Violation:** `EventSource` closes on error with no backoff reconnect strategy in service layer; passive display may silently run on stale polling cadence.
- **Fix:** Add exponential reconnect logic and explicit “connection degraded” banner.

### 9) Low: Accessibility violations on clickable `div` controls
- **Severity:** Low
- **Location:** `App.tsx:184,196,208`
- **Violation:** Clickable non-semantic `div` elements break keyboard navigation and screen reader semantics (WCAG 2.1.1/4.1.2).
- **Fix:** Replace with semantic `button` or add `role="button"`, `tabIndex={0}`, keyboard handlers.

### 10) Medium: Input sanitization is partial and trust boundary is unclear
- **Severity:** Medium
- **Location:** `components/PatientForm.tsx`, `pages/ReceptionView.tsx`, `server/src/application/useCases.ts:192`
- **Violation:** Client sends raw names/symptoms; backend sanitizes only prescription text. Today React escaping prevents DOM XSS in rendered text, but canonicalization and server-side validation policy is inconsistent.
- **Fix:**
  - Enforce server-side normalization/validation for all free-text fields (length, charset, control chars).
  - Keep UI escaping (already safe) and avoid any `dangerouslySetInnerHTML` usage.

### 11) Medium: Network failures do not expose status-specific recovery actions
- **Severity:** Medium
- **Location:** `services/queueService.ts:160,179,196,217,226,268`
- **Violation:** Many paths throw generic errors (`'Failed to fetch ...'`), collapsing 404/409/500 distinctions and preventing precise UX fallback.
- **Fix:** Parse status codes and return typed client errors (`NotFound`, `Conflict`, `TransientNetwork`) with tailored UI copy.

---

## Sanitization / XSS Verdict

- **Current state:** Rendering path is mostly safe because React escapes string interpolation in components (`PatientCard`, `PatientView`, `TVDisplay`).
- **Residual risk:** Server-side normalization policy is inconsistent across fields; future HTML rendering additions would become dangerous without a shared sanitization utility.

## Required Remediation Order (24h Go-Live)

1. Add global Error Boundary + safe defaults in `QueueGraph`.
2. Implement fetch timeout/abort + typed network errors + inline retries.
3. Add virtualization/paging strategy for queue-heavy views.
4. Harden TV display reconnect/degraded-mode UX.
5. Replace clickable `div` navigation controls with accessible semantic controls.

## Final Go/No-Go

**No-Go for production in current frontend state.**

Main blockers are crash resilience gaps, weak failure UX on network issues, and non-scalable rendering/data-fetch patterns under realistic hospital volumes.
