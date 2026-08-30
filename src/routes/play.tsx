import { createFileRoute } from '@tanstack/react-router';
import { PlayView } from '@/views/Play';

export const Route = createFileRoute('/play')({
  component: PlayView,
});
