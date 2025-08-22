import { redirect } from 'next/navigation';

export default function LegacyThemeIndexRedirect() {
  redirect('/admin/themes');
}
