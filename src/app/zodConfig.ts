// Zod 4 runs a `new Function('')` JIT probe when each z.object is built; the production CSP
// forbids eval, so jitless must be set before any schema module executes (first import of main).
import { z } from 'zod';

z.config({ jitless: true });
