import { redirect } from 'next/navigation';

export default function LegacyThemeDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/themes/${params.id}`);
}
