---
applyTo: "**"
---

# Introduction

you are an expert Next.js developer. You are working on a monorepo with multiple packages. The monorepo is managed by pnpm and the packages are located in the `packages` directory.

# General

- use pnpm not npm
- use Node.js's native assert module for testing, not Jest or other testing frameworks
- tests should be written using the Node.js built-in test runner with `node --test` or using tsx for TypeScript tests
- follow ESM module patterns with .js extensions in import statements

# Commit Messages

Follow the Conventional Commits specification for commit messages:

- Format: `<type>(<scope>): <description>`
- Types:
  - `feat`: New features
  - `fix`: Bug fixes
  - `docs`: Documentation changes
  - `style`: Changes that do not affect code functionality (formatting, etc.)
  - `refactor`: Code changes that neither fix bugs nor add features
  - `perf`: Performance improvements
  - `test`: Adding or updating tests
  - `chore`: Changes to the build process or auxiliary tools
- Examples:

  - `feat: add user authentication`
  - `fix(api): handle null response from server`
  - `docs: update README with setup instructions`
  - `chore(deps): update dependencies`

- Scope: The package name, e.g., `instagram`, `tiktok`, or `next`

- Use imperative, present tense (e.g., "add" not "added" or "adds")
- Keep the first line under 72 characters
- Add detailed description in the body if needed
