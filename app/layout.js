import './globals.css'
import { Outfit } from 'next/font/google'
import { GlobalReconnectBanner } from './catana/components/GlobalReconnectBanner'
import { MatchAlertProvider } from './catana/matchAlerts/MatchAlertProvider'
import { SITE_METADATA } from './metadata.js'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = SITE_METADATA

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div className="settlex-ui-root">
          <MatchAlertProvider>
            {children}
            <GlobalReconnectBanner />
          </MatchAlertProvider>
        </div>
      </body>
    </html>
  )
}
