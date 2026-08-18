import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono, Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

/** Body copy. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/** Display face — set tight and heavy for headings and the wordmark. */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
})

/** Utility face — dates, reference codes, and the machine-readable zone. */
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Visa Tracker — Digital Concierge',
  description:
    'Track visa application documents, deadlines, and progress in one calm, organized workspace.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/logo.webp', type: 'image/webp' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

/**
 * Stamps the stored theme onto <html> before the first paint. Without it the
 * page renders light, then snaps to dark once React hydrates. Kept in sync
 * with THEME_STORAGE_KEY in components/theme-provider.tsx.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('vt-theme');if(t!=='light'&&t!=='dark'&&t!=='system')t='system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var e=document.documentElement;e.classList.add(r);e.classList.remove(r==='dark'?'light':'dark');e.style.colorScheme=r;}catch(_){}})();`

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef1f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1420' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} ${plexMono.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
