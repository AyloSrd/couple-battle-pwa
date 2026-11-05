import '@testing-library/jest-dom/vitest';
// jsdom has no canvas: the Final confetti draws nothing in tests instead of logging an error.
HTMLCanvasElement.prototype.getContext = () => null;
