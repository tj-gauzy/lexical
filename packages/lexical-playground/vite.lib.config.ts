/**
 * Vite library build config.
 *
 * Outputs:
 *   dist/lexical-editor.umd.js  — IIFE bundle exposing window.LexicalEditor
 *   dist/style.css              — extracted editor styles
 *   dist/fonts/                 — Excalidraw fonts (flat structure)
 *
 * Build commands (package.json scripts):
 *   pnpm run build:lib        # dev build
 *   pnpm run build:lib-prod   # minified production build
 */

import babel from '@rollup/plugin-babel';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import type {PreRenderedAsset} from 'rollup';
import type {Plugin} from 'vite';
import {defineConfig} from 'vite';

import transformErrorMessages from '../../scripts/error-codes/transform-error-messages.mjs';
import viteMonorepoResolutionPlugin from '../shared/lexicalMonorepoPlugin';

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Dev demo copy plugin
// Copies src/standalone/index.html into dist/ in non-production builds so
// you can open dist/index.html in a browser right after `pnpm build:lib`.
// ---------------------------------------------------------------------------
function copyDemoHtml(): Plugin {
  return {
    name: 'copy-demo-html',
    closeBundle() {
      const src = path.resolve(__dirname, 'src/standalone/index.html');
      const dest = path.resolve(__dirname, 'dist/index.html');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Font copy plugin
// Copies Excalidraw fonts directly into dist/fonts/ without preserving the
// deeply-nested node_modules/.pnpm/... directory structure.
// ---------------------------------------------------------------------------
function copyExcalidrawFonts(): Plugin {
  return {
    name: 'copy-excalidraw-fonts',
    closeBundle() {
      const entryFile = require.resolve('@excalidraw/excalidraw');
      const fontsDir = path.join(path.dirname(entryFile), 'fonts');
      const destDir = path.resolve(__dirname, 'dist/fonts');
      if (fs.existsSync(fontsDir)) {
        fs.cpSync(fontsDir, destDir, {recursive: true});
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Unicode Sets RegExp fix plugin
//
// @babel/plugin-transform-unicode-sets-regex handles regex literals (/x/v)
// but misses new RegExp("pattern", "v") calls that originate from workspace
// packages excluded from Babel processing (exclude: '**/node_modules/**').
//
// This plugin runs on the final IIFE chunk (renderChunk) and replaces every
// remaining new RegExp(staticString, "...v...") with a Chrome-79-compatible
// equivalent using regexpu-core — the same engine Babel uses internally.
// ---------------------------------------------------------------------------
function fixUnicodeSetsRegex(): Plugin {
  // regexpu-core is a transitive dependency of @babel/plugin-transform-unicode-sets-regex
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rewritePattern = require('regexpu-core') as (
    pattern: string,
    flags: string,
    options: Record<string, unknown>,
  ) => string;

  // Matches: new RegExp("any-double-quoted-string", "flags-containing-v")
  // Captures: (1) the quoted pattern  (2) the flag string
  const RE =
    /new\s+RegExp\(("(?:[^"\\]|\\.)*")\s*,\s*"([a-zA-Z]*)"\)/g;

  return {
    name: 'fix-unicode-sets-regex',
    renderChunk(code) {
      let changed = false;
      const result = code.replace(RE, (match, quotedPattern, flags) => {
        if (!flags.includes('v')) return match;
        try {
          // Un-escape the quoted pattern string (handles \" inside the string)
          const pattern = JSON.parse(quotedPattern) as string;
          // regexpu-core's valid option is unicodeSetsFlag (not useUnicodeFlag).
          // The rewritten pattern targets u-flag semantics; swap v → u in flags.
          const newPattern = rewritePattern(pattern, 'v', {
            unicodeSetsFlag: 'transform',
          });
          const newFlags = flags.replace('v', 'u');
          changed = true;
          return `new RegExp(${JSON.stringify(newPattern)},"${newFlags}")`;
        } catch (e) {
          // Keep original if rewrite fails; the build will still succeed but
          // the regex might throw at runtime on older browsers.
          console.warn(`[fix-unicode-sets-regex] Could not transform: ${match}\n${e}`);
          return match;
        }
      });
      return changed ? {code: result, map: {mappings: ''}} : null;
    },
  };
}

// ---------------------------------------------------------------------------
// Asset filename resolver
//   - CSS → style.css
//   - images/** → images/<subpath> (preserves icons/ and emoji/ sub-directories)
//   - everything else → [name][extname]
// ---------------------------------------------------------------------------
function assetFileNames(assetInfo: PreRenderedAsset): string {
  if (assetInfo.name?.endsWith('.css')) return 'style.css';

  // Rollup 4 (Vite 8) exposes the full source path via originalFileNames[].
  // Extract everything after the first /images/ segment so that
  // src/images/icons/gear.svg → images/icons/gear.svg in dist/.
  const origPaths: readonly string[] =
    (assetInfo as unknown as {originalFileNames?: string[]}).originalFileNames ?? [];
  for (const origPath of origPaths) {
    const normalized = origPath.replace(/\\/g, '/');
    const match = normalized.match(/\/images\/(.+)$/);
    if (match) return `images/${match[1]}`;
  }

  return '[name][extname]';
}

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/standalone/index.ts'),
      // IIFE is the correct format for browser <script> tags. Unlike UMD it
      // does not probe typeof exports/module/define, which are pre-defined by
      // Webpack/UMI in bundled environments and would redirect exports away
      // from the window global.
      fileName: () => 'lexical-editor.umd.js',
      formats: ['umd'],
      name: 'LexicalEditor', // → window.LexicalEditor = { mountLexicalEditor }
    },
    outDir: 'dist',
    rollupOptions: {
      // Bundle everything including React — no version conflicts with host app.
      external: [],
      output: {
        assetFileNames,
      },
    },
    sourcemap: mode !== 'production' ? 'inline' : false,
    // ES2019 target for Webpack/Babel compatibility in the host app.
    target: 'es2019',
    ...(mode === 'production' ? {
      minify: 'terser',
      terserOptions: {
        compress: {
          toplevel: true,
        },
        keep_classnames: true,
      },
    } : {
      minify: false,
    }),
  },
  define: {
    // Explicit NODE_ENV prevents "process is not defined" errors when React 19
    // runs inside the IIFE where process is not a browser global.
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development',
    ),
    'process.env.EXCALIDRAW_ASSET_PATH': JSON.stringify('/'),
  },
  plugins: [
    viteMonorepoResolutionPlugin(),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      configFile: false,
      exclude: '**/node_modules/**',
      extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
      plugins: [
        '@babel/plugin-transform-flow-strip-types',
        // First-pass: transforms regex literals (/x/v) and static new RegExp()
        // calls that Babel can see in workspace source files.
        '@babel/plugin-transform-unicode-sets-regex',
        ...(mode !== 'production'
          ? [
              [
                transformErrorMessages,
                {
                  noMinify: true,
                },
              ],
            ]
          : []),
      ],
      presets: [['@babel/preset-react', {runtime: 'automatic'}]],
    }),
    react(),
    // Second-pass: catches any remaining new RegExp("pattern","v") in the
    // final bundle that the Babel plugin missed (e.g. from packages excluded
    // by '**/node_modules/**' or that used dynamic string construction).
    fixUnicodeSetsRegex(),
    // copyExcalidrawFonts(),
    ...(mode !== 'production' ? [copyDemoHtml()] : []),
  ],
}));
