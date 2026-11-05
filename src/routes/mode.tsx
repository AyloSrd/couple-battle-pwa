import { createFileRoute, redirect } from '@tanstack/react-router';
import { ModeView } from '@/views/Mode';

export const Route = createFileRoute('/mode')({
  // The draft is memory only: a reload here has lost the roster.
  beforeLoad: ({ context }) => {
    if (!context.draft.get().roster) throw redirect({ to: '/setup', replace: true });
  },
  component: ModeView,
});
