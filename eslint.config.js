import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

/**
 * Flat config. The `boundaries` block is the enforced version of the
 * import-boundary table in ARCHITECTURE.md.
 *
 * Element model: every file under a view (`src/views/<Slice>/`) or shared entity
 * (`src/shared/<Slice>/`) is classified by its layer folder, capturing `group`
 * (views|shared) and `slice` (entity name). Rules use those captures to require
 * same-slice imports and to forbid a slice reaching into another slice's
 * internals — cross-slice contact is only allowed through a shared entity's
 * public index (shared/<slice>/index).
 */
const sameSlice = {
  group: '{{ from.captured.group }}',
  slice: '{{ from.captured.slice }}',
};

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'handoff', 'public', 'src/routeTree.gen.ts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      boundaries,
    },
    settings: {
      'boundaries/dependency-nodes': ['import'],
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'routes', pattern: 'src/routes' },
        { type: 'domain', pattern: 'src/*/*/domain', capture: ['group', 'slice'] },
        { type: 'api', pattern: 'src/*/*/api', capture: ['group', 'slice'] },
        {
          type: 'application',
          pattern: 'src/*/*/application',
          capture: ['group', 'slice'],
        },
        {
          type: 'components',
          pattern: 'src/*/*/components',
          capture: ['group', 'slice'],
        },
        {
          type: 'provider',
          pattern: 'src/*/*/provider.*',
          partialMatch: false,
          capture: ['group', 'slice'],
        },
        {
          type: 'index',
          pattern: 'src/*/*/index.*',
          partialMatch: false,
          capture: ['group', 'slice'],
        },
      ],
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'boundaries/no-unknown': 'off',
      'boundaries/no-unknown-files': 'off',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '{{ from.type }} may not import {{ to.type }} — see ARCHITECTURE.md import-boundary table.',
          policies: [
            // app/container.ts is the ONLY module that names a backend: it may
            // wire any adapter and compose any public surface.
            {
              from: { element: { type: 'app' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: [
                          'app',
                          'routes',
                          'index',
                          'provider',
                          'domain',
                          'api',
                          'application',
                          'components',
                        ],
                      },
                    },
                  },
                },
              ],
            },

            // routes mount providers with adapters taken from context; they
            // compose view/shared public surfaces only — never construct backends.
            {
              from: { element: { type: 'routes' } },
              allow: [
                { to: { element: { types: { anyOf: ['routes', 'index', 'provider'] } } } },
              ],
            },

            // provider.tsx: DI seam — api port type + its own ctx/domain (same slice).
            {
              from: { element: { type: 'provider' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['api', 'application', 'domain'] },
                      captured: sameSlice,
                    },
                  },
                },
                { to: { element: { type: 'index', captured: { group: 'shared' } } } },
              ],
            },

            // application: domain + own provider (use[View]Api) + shared surface.
            // Never api adapters.
            {
              from: { element: { type: 'application' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['application', 'domain', 'provider'] },
                      captured: sameSlice,
                    },
                  },
                },
                { to: { element: { type: 'index', captured: { group: 'shared' } } } },
              ],
            },

            // components: application + domain services + shared surface. Never api.
            {
              from: { element: { type: 'components' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['components', 'application', 'domain'] },
                      captured: sameSlice,
                    },
                  },
                },
                { to: { element: { type: 'index', captured: { group: 'shared' } } } },
              ],
            },

            // api adapters implement domain types — nothing else (same slice).
            {
              from: { element: { type: 'api' } },
              allow: [
                { to: { element: { type: 'domain', captured: sameSlice } } },
              ],
            },

            // domain is pure: only its own domain + shared domain.
            {
              from: { element: { type: 'domain' } },
              allow: [
                { to: { element: { type: 'domain', captured: sameSlice } } },
                { to: { element: { type: 'domain', captured: { group: 'shared' } } } },
              ],
            },

            // index.tsx assembles the screen + re-exports its own slice, and may
            // compose shared public surfaces.
            {
              from: { element: { type: 'index' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['components', 'application', 'domain', 'provider'] },
                      captured: sameSlice,
                    },
                  },
                },
                { to: { element: { type: 'index', captured: { group: 'shared' } } } },
              ],
            },
          ],
        },
      ],
    },
  },

  // Test files & test harness: TS/vitest handle these; keep boundaries off.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'boundaries/dependencies': 'off',
    },
  },
);
