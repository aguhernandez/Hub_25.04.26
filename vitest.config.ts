import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/vbt-*.test.{ts,tsx}'], environment: 'jsdom', pool: 'forks', poolOptions: { forks: { singleFork: true } } } });
