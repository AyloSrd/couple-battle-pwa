import { createFileRoute, redirect } from '@tanstack/react-router';
import { PlayView, PlayCrash } from '@/views/Play';

export const Route = createFileRoute('/play')({
  // A finished game counts: the Final screen (and Rematch) still need it.
  beforeLoad: ({ context }) => {
    if (!context.store.get().game) throw redirect({ to: '/', replace: true });
  },
  component: PlayView,
  errorComponent: ({ reset }) => <PlayCrash onRetry={reset} />,
});
