import { createFileRoute } from '@tanstack/react-router';
import { SettingsView } from '@/views/Settings';

export const Route = createFileRoute('/settings')({
  component: SettingsView,
});
