import { createFileRoute } from '@tanstack/react-router';
import { SetupView } from '@/views/Setup';

export const Route = createFileRoute('/setup')({
  component: SetupView,
});
