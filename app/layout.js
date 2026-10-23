import './globals.css'
import { Outfit } from 'next/font/google'
import { GlobalReconnectBanner } from './_features/matches/session/GlobalReconnectBanner'
import { MatchAlertProvider } from './_features/matches/alerts/MatchAlertProvider'
import { SITE_METADATA } from './metadata.js'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = SITE_METADATA

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
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
