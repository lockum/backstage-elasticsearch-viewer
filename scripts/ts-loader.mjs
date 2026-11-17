import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    try {
      const parentURL = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      const parentDir = path.dirname(parentURL);
      const basePath = path.resolve(parentDir, specifier);

      const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.tsx`,
        `${basePath}.js`,
        `${basePath}.mjs`,
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.tsx'),
        path.join(basePath, 'index.js'),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()) {
          return {
            shortCircuit: true,
            url: pathToFileURL(candidate).href,
          };
        }
      }
    } catch {
      // Fall through to default resolver
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.tsx') || url.endsWith('.ts')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');

    const result = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filePath,
    });

    return {
      format: 'module',
      shortCircuit: true,
      source: result.outputText,
    };
  }

  return nextLoad(url, context);
}
