# AI Assistant Instructions & Workspace Rules

## 🛑 Git Operations & Safety Policies

### 1. Strictly Prohibit `git push`
- **NEVER** run `git push` under any circumstance.
- Pushing to remote repositories (`origin`, upstream, or any branch) is strictly reserved for the user.
- Always leave pushes to be performed manually by the user.

### 2. Mandatory User Confirmation Before `git commit`
- **NEVER** run `git commit` automatically or autonomously.
- Before running any commit command, you **MUST** pause, present the proposed changes, and ask the user for explicit approval.
- When asking for approval, you must provide:
  - **Proposed commit message** (following Conventional Commits format, e.g. `feat: ...`, `fix: ...`).
  - **List of staged files**.
  - **Brief summary of the changes**.
- Wait for the user's explicit response before running `git commit`.

### 3. Read & Staging Operations
- Inspection commands (`git status`, `git diff`, `git log`) and staging (`git add <files>`) are allowed during normal work, but final commits require the explicit prompt described above.

---

## 🛠️ Project Architecture & Coding Standards

1. **Vanilla JavaScript (ES Modules)**:
   - Use clean, modular ES6+ modules (`import` / `export`).
   - Maintain separation of concerns: UI components, auth services, API adapters, calculation engines.
2. **Firebase Auth & Realtime Database**:
   - Always pre-validate user inputs prior to Firebase calls.
   - Gracefully handle asynchronous session restore via `onAuthStateChanged`.
   - Never expose administrative keys or secrets.
3. **URL & Navigation Consistency**:
   - Remember that local servers or static hosts may handle URLs with or without `.html`. Match routes flexibly using regex (`/.*pages\/<name>(\.html)?/`).
   - Preserve `serve.json` with `"cleanUrls": false`.
4. **Playwright Test Suite**:
   - Multi-device matrix support: Desktop Chrome (1280x720), Galaxy Tab S4 (712x1138), Pixel 5 (393x851).
   - Use Page Object Model (POM) pattern from `Test Automation e2e/pages/`.
   - Ensure fail-fast error detection for authentication or asynchronous modals.

