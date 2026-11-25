# Antigravity Agent Guidelines

## 🛑 Critical Rules: Git Safety

1. **NO `git push`**:
   - The agent must **NEVER** execute `git push` under any condition. All remote pushes must be performed manually by the user.

2. **CONFIRM BEFORE `git commit`**:
   - The agent must **NEVER** commit autonomously.
   - Before executing `git commit`, the agent **MUST** stop and ask the user for explicit confirmation.
   - Present:
     - The staged files (`git status -s`).
     - The planned commit message.
     - A concise summary of changes.
   - Do not proceed with `git commit` until the user explicitly approves.

---

## 🏗️ Technical Guidelines

- **Frontend**: Vanilla ES Modules, Bootstrap 5, responsive layouts (Desktop, Tablet, Mobile).
- **Backend / Storage**: Firebase Auth and Realtime Database.
- **Testing**: Playwright multi-device test automation in `Test Automation e2e/`.
- **CI/CD**: GitHub Actions matrix workflow (`.github/workflows/e2e-tests.yml`).

