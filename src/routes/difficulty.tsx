import { createFileRoute } from '@tanstack/react-router';
import { DifficultyView } from '@/views/Difficulty';

export const Route = createFileRoute('/difficulty')({
  component: DifficultyView,
});
