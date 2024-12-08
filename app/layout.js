import { Handjet } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext';

const handjet = Handjet({ 
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'بالي بالك | تفكر باللي أفكر فيه؟',
  description: 'لعبة جماعية مع أصدقائك أو عائلتك تونس الجلسة',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${handjet.className}`}>
        <LanguageProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </LanguageProvider>
      </body>
    </html>
  )
}
