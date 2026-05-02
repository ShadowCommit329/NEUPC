import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/app/_lib/supabase';
import BootcampPublicPage from './_components/BootcampPublicPage';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin
    .from('bootcamps')
    .select('title, description, thumbnail')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!data) return { title: 'Bootcamp Not Found' };

  return {
    title: `${data.title} | NEUPC Bootcamp`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.thumbnail ? [{ url: data.thumbnail }] : [],
    },
  };
}

export default async function BootcampSlugPage({ params }) {
  const { slug } = await params;

  const { data: bootcamp } = await supabaseAdmin
    .from('bootcamps')
    .select(
      'id, title, slug, description, thumbnail, price, batch_info, start_date, end_date, total_lessons, total_duration, is_featured, courses(count)'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!bootcamp) notFound();

  return <BootcampPublicPage bootcamp={bootcamp} />;
}
