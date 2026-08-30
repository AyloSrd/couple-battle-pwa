import { createFileRoute } from '@tanstack/react-router';
import { HowToPlayView } from '@/views/HowToPlay';

export const Route = createFileRoute('/how-to-play')({
  component: HowToPlayView,
});
