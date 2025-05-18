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
