import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { AuthModal } from "@/components/auth/auth-modal"
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Reyko Nakao Barber",
  description: "Premium grooming experience in Sarasota, FL.",
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const rawLocale = (await cookies()).get('NEXT_LOCALE')?.value ?? 'en'
  const locale = (rawLocale in dictionaries ? rawLocale : 'en') as Locale
  const dict = dictionaries[locale]

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <AuthModal dict={dict} />
        </Suspense>
      </body>
    </html>
  )
}
