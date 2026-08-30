import { createFileRoute } from '@tanstack/react-router';
import { LegalView } from '@/views/Legal';

export const Route = createFileRoute('/legal')({
  component: LegalView,
});
