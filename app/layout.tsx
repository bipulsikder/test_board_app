import "./globals.css"
import type { ReactNode } from "react"
import CookieConsent from "../components/CookieConsent"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
