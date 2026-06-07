// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react'

declare global {
  interface Window {
    Tawk_API?: object
    Tawk_LoadStart?: Date
  }
}

const PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID as string | undefined
const WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID as string | undefined

export function TawkChat() {
  useEffect(() => {
    if (!PROPERTY_ID || !WIDGET_ID) return

    window.Tawk_API = window.Tawk_API ?? {}
    window.Tawk_LoadStart = new Date()

    const script = document.createElement('script')
    script.id = 'tawk-script'
    script.async = true
    script.src = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`
    script.setAttribute('crossorigin', '*')

    const first = document.getElementsByTagName('script')[0]
    first.parentNode?.insertBefore(script, first)

    return () => {
      document.getElementById('tawk-script')?.remove()
    }
  }, [])

  return null
}
