import { createFileRoute } from '@tanstack/react-router';
import { HomeView } from '@/views/Home';

export const Route = createFileRoute('/')({
  component: HomeView,
});
