import type React from "react"
import type { Metadata } from "next"
import { Figtree, Instrument_Serif } from "next/font/google"
import { GoogleAnalytics } from '@next/third-parties/google'
import Header from "@/components/Header"
import "./globals.css"
import Gradient from "@/components/Gradient"
import { Providers } from "@/components/Providers"
import { Toaster } from 'react-hot-toast'

const figtree = Figtree({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-figtree",
    display: "swap",
})

const instrument = Instrument_Serif({
    weight: ["400"],
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Maatchaa",
    description: "",
    generator: "",
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
        <body className={`${figtree.variable}`}>
            <Providers>
                <div className="flex flex-col min-h-screen overflow-x-hidden">
                    <Header/>
                    <main className="flex flex-grow items-center justify-center w-full px-6">
                        {children}
                        {/* Absolute positioned background */}
                        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
                            <Gradient
                                className="w-full h-full"
                                gradientColors={[
                                    "#8FAF6F", // Light matcha green
                                    "#9AAF85", // Matcha green
                                    "#A8B894", // Green-beige transition
                                    "#C4C0A8", // Warm beige-green
                                    "#C4C0A8", // Soft beige
                                ]}
                                noise={0.1}
                                spotlightRadius={0.6}
                                spotlightOpacity={0}
                                distortAmount={0.1}
                                mirrorGradient={false}
                                angle={0}
                                paused={true}
                            />
                        </div>
                    </main>
                </div>
                <Toaster />
            </Providers>
            {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
                <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
            )}
        </body>
        </html>
    )
}
