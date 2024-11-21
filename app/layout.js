import { Handjet } from 'next/font/google'

const handjet = Handjet({ 
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${handjet.className} bg-gradient-to-br from-purple-100 to-blue-100`}>
        {children}
      </body>
    </html>
  )
}
