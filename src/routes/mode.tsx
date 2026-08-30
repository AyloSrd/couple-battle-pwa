import { createFileRoute } from '@tanstack/react-router';
import { ModeView } from '@/views/Mode';

export const Route = createFileRoute('/mode')({
  component: ModeView,
});
