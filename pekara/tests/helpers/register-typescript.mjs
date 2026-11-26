// Node's type stripping cannot execute TSX. Use the already installed TypeScript
// compiler for email templates; database calls remain real PostgreSQL calls.
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import ts from 'typescript';

const cacheMock = new URL('../mocks/next-cache.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    // Email HTML uses the real React DOM renderer. Keep server-only enabled,
    // but resolve React's normal runtime rather than its RSC-only entry point.
    if (
      specifier === 'react' ||
      specifier.startsWith('react/') ||
      specifier === 'react-dom' ||
      specifier.startsWith('react-dom/')
    )
      return nextResolve(specifier, {
        ...context,
        conditions: context.conditions.filter(
          (condition) => condition !== 'react-server',
        ),
      });
    if (specifier === 'next/cache' || specifier === 'next/cache.js')
      return { url: cacheMock, shortCircuit: true };
    if (specifier.startsWith('next/') && !specifier.endsWith('.js')) {
      try {
        return nextResolve(`${specifier}.js`, context);
      } catch {
        /* use the original resolver below */
      }
    }
    if (specifier.startsWith('@/'))
      specifier = pathToFileURL(resolvePath('src', specifier.slice(2))).href;
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.') || specifier.startsWith('file:')) {
        const url = new URL(specifier, context.parentURL);
        for (const extension of ['.ts', '.tsx', '/index.ts']) {
          const candidate = new URL(url.href + extension);
          if (existsSync(fileURLToPath(candidate)))
            return { url: candidate.href, shortCircuit: true };
        }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.tsx'))
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return nextLoad(url, context);
  },
});
const { getIntegrationDatabaseUrl } = await import('./db.ts');
getIntegrationDatabaseUrl();
