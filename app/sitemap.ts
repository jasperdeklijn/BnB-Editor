import type { MetadataRoute } from 'next'
import { PLATFORM_BASE_URL } from '@/lib/platform'
import { MARKETING_DEMOS } from '@/lib/marketing-demos'
import { MARKETING_PAGES } from '@/lib/marketing'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = PLATFORM_BASE_URL

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/legal`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/processor-agreement`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/acceptable-use`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/melding-onrechtmatige-content`,
      lastModified: new Date('2026-09-17'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/status`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  return [...staticUrls, ...Object.keys(MARKETING_PAGES).map(path => ({
    url: `${baseUrl}${path}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })), ...MARKETING_DEMOS.map((demo) => ({
    url: `${baseUrl}/voorbeelden/${demo.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))]
}
