import { Handjet } from 'next/font/google'
import './globals.css'

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
      <head>
        <link rel="alternate" hreflang="ar" href="https://www.balibalik.com" />
        <link rel="alternate" hreflang="en" href="https://en.balibalik.com" />
        <script 
          type="text/javascript" 
          src="https://cdn.weglot.com/weglot.min.js"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              Weglot.initialize({
                api_key: 'wg_ac65c208f7ceaf68132a894c73b20e960'
              });
            `
          }}
        />
      </head>
      <body className={`${handjet.className}`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
