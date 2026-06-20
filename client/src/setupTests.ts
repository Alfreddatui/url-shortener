import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { expect, afterEach } from 'vitest';

// Extend Vitest's expect with jest-dom matchers (toBeInTheDocument, etc.)
expect.extend(matchers);

// Auto-cleanup rendered components between tests — required when not using
// Vitest's global mode, since @testing-library/react's auto-cleanup relies
// on a global afterEach being present.
afterEach(cleanup);
