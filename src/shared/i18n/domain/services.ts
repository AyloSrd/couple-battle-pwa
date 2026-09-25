import type { TStringVars } from './types';

/**
 * Replace `{placeholder}` slots in a template with values. Unknown slots are
 * left untouched (visible in dev), missing vars object is a no-op.
 */
export function interpolate(template: string, vars?: TStringVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    // Own keys only: `{constructor}`/`{toString}` must not reach the prototype.
    const value = Object.hasOwn(vars, key) ? vars[key] : undefined;
    return value === undefined ? match : String(value);
  });
}
