'use client'

import { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { AppName } from '@/components/ui/AppName'

interface DashboardLayoutProps {
  children: React.ReactNode
  banner?: React.ReactNode
}

export function DashboardLayout({ children, banner }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Global header across the full width */}
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* Sidebars below the header */}
      <Sidebar 
        open={sidebarOpen} 
        setOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      
      {/* Main content area - Salesforce Setup-style */}
      <div className={`flex-1 pt-16 bg-[rgba(233,201,168,0.23)] flex flex-col min-h-0 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto">
          {banner && (
            <div className="border-b border-gray-200 mb-6 pb-4">
              {banner}
            </div>
          )}
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
