import './globals.css'
import { Outfit } from 'next/font/google'
import { GlobalReconnectBanner } from './catana/components/GlobalReconnectBanner'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'Settlehex',
  description: 'Settle. Trade. Conquer.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div className="settlex-ui-root">
          {children}
          <GlobalReconnectBanner />
        </div>
      </body>
    </html>
  )
}
