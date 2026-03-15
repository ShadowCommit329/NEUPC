/**
 * @file Blogs page
 * @module BlogsPage
 */

import {
  getPublicBlogs,
  getAllPublicSettings,
} from '@/app/_lib/public-actions';
import BlogsClient from './BlogsClient';
import { buildMetadata } from '@/app/_lib/seo';
import {
  CollectionPageJsonLd,
  BreadcrumbJsonLd,
} from '@/app/_components/ui/JsonLd';

export const metadata = buildMetadata({
  title: 'Blogs',
  description:
    'Read tutorials, contest insights, career guidance, and community stories from NEUPC members and mentors.',
  pathname: '/blogs',
  keywords: [
    'blog',
    'tutorials',
    'programming articles',
    'contest editorials',
    'career guidance',
    'tech blog',
  ],
});

export default async function BlogsPage() {
  const [blogs, settings] = await Promise.all([
    getPublicBlogs(),
    getAllPublicSettings(),
  ]);

  return (
    <>
      <CollectionPageJsonLd
        name="Blog - NEUPC"
        description="Tutorials, contest editorials, and community stories from NEUPC members."
        url="/blogs"
      />
      <BreadcrumbJsonLd
        items={[{ name: 'Home', url: '/' }, { name: 'Blogs' }]}
      />
      <BlogsClient initialBlogs={blogs} settings={settings} />
    </>
  );
}
