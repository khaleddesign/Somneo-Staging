import type { Metadata } from 'next'
import { Cormorant_Garamond, Syne, DM_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from 'sonner'
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
  description: 'Secure SOMNOVENTIS Portal',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()

  return (
    <html lang="en">
      <body
        className={`${cormorantGaramond.variable} ${syne.variable} ${dmSans.variable} antialiased bg-sand text-midnight`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster richColors position="bottom-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
