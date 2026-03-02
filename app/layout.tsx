import type { Metadata } from 'next'
import { Cormorant_Garamond, Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
})

const syne = Syne({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'SomnoConnect',
  description: 'Portail sécurisé SOMNOVENTIS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body
        className={`${cormorantGaramond.variable} ${syne.variable} ${dmSans.variable} antialiased bg-sand text-midnight`}
      >
        {children}
      </body>
    </html>
  )
}
