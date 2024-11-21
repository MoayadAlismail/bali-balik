import { Handjet } from 'next/font/google'
import './globals.css'

const handjet = Handjet({ 
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata = {
  title: 'يلا نلعب! | لعبة جماعية ممتعة',
  description: 'العب مع أصدقائك في أجواء ممتعة ومليئة بالتحدي',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${handjet.className}`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
