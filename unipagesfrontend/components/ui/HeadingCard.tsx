'use client'

import { LucideIcon } from 'lucide-react'

interface HeadingCardProps {
  title: string
  subtitle?: string
  tag?: string
  Icon?: LucideIcon
  rightSlot?: React.ReactNode
}

export function HeadingCard({ title, subtitle, tag = 'SETUP', Icon, rightSlot }: HeadingCardProps) {
  return (
    <div className="relative rounded-md border bg-white shadow-md scroll-smooth">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="h-10 w-10 rounded bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6" />
            </div>
          ) : null}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {tag}
            </div>
            <div className="text-2xl font-semibold text-gray-900">{title}</div>
            {subtitle ? (
              <div className="text-gray-600 text-sm">{subtitle}</div>
            ) : null}
          </div>
        </div>

        {rightSlot ? <div className="ml-4">{rightSlot}</div> : null}
      </div>
    </div>
  )
}

export default HeadingCard


