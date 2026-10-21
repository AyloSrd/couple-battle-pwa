import { createFileRoute } from '@tanstack/react-router';
import { AboutView } from '@/views/About';

export const Route = createFileRoute('/about')({
  component: AboutView,
});
