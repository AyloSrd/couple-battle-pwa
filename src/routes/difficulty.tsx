import { createFileRoute, redirect } from '@tanstack/react-router';
import { DifficultyView } from '@/views/Difficulty';

export const Route = createFileRoute('/difficulty')({
  beforeLoad: ({ context }) => {
    const { roster, mode } = context.draft.get();
    if (!roster || !mode) throw redirect({ to: '/setup', replace: true });
  },
  component: DifficultyView,
});
