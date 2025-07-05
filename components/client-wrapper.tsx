"use client"

import type { ReactNode } from "react"

interface ClientWrapperProps {
  children: ReactNode
}

export default function ClientWrapper({ children }: ClientWrapperProps) {
  return <>{children}</>
}
