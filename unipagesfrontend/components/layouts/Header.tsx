'use client'

import { Menu, Bell, User, LogOut, Settings, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { useSession, signOut } from 'next-auth/react'
import { AppName } from '@/components/ui/AppName'
import { APP_NAME } from '@/lib/config'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { performCompleteLogout } from '@/utils/logout'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSignOut = async () => {
    await performCompleteLogout(session);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim().toLowerCase()
    
    if (query === '') {
      return
    }

    // Navigate to different pages based on search query
    if (query.includes('role') || query.includes('roles')) {
      router.push('/admin/roles')
    } else if (query.includes('user') || query.includes('users')) {
      router.push('/admin/users')
    } else if (query.includes('profile') || query.includes('profiles')) {
      router.push('/admin/profiles')
    } else if (query.includes('permission') || query.includes('permissions')) {
      router.push('/admin/permission-sets')
    }
    
    setSearchQuery('') // Clear search after navigation
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Salesforce-style blue header bar with subtle pattern */}
      <div className="h-16 bg-gradient-to-r from-[#009bda] to-[#0070d2] relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
            backgroundSize: '100px 100px, 150px 150px'
          }} />
        </div>
        
        <div className="relative h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Menu button and brand */}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              className="-m-2.5 p-2.5 text-white hover:bg-white/10 lg:hidden"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>

            {/* Separator for mobile */}
            <div className="h-6 w-px bg-white/20 lg:hidden" aria-hidden="true" />

            {/* Brand logo and name */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <img src="/logo.jpg" alt="UniPages" className="h-8 w-8 object-cover rounded-full" />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight"><AppName /></span>
            </div>
          </div>

          {/* Center search bar */}
          <div className="hidden lg:flex flex-1 items-center justify-center px-6 max-w-2xl">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search UniMark"
                className="w-full h-10 rounded-md border-0 bg-white/90 backdrop-blur-sm pl-10 pr-4 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white"
                aria-label={`Search ${APP_NAME}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                role="searchbox"
                aria-describedby="search-description"
              />
              <div id="search-description" className="sr-only">
                Press Enter to search. Try searching for: roles, users, profiles, permissions
              </div>
            </form>
          </div>

          {/* Mobile search bar */}
          <div className="lg:hidden flex-1 px-4">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search UniMark"
                className="w-full h-9 rounded-md border-0 bg-white/90 backdrop-blur-sm pl-10 pr-4 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white"
                aria-label={`Search ${APP_NAME}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                role="searchbox"
                aria-describedby="mobile-search-description"
              />
              <div id="mobile-search-description" className="sr-only">
                Press Enter to search
              </div>
            </form>
          </div>

          {/* Right side - Notifications and profile */}
          <div className="flex items-center gap-4">
            {/* Circular notification icon */}
            <Button
              type="button"
              variant="ghost"
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white p-0"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Button>

            {/* Separator */}
            <div className="h-6 w-px bg-white/20" aria-hidden="true" />

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 p-0">
                  <Avatar className="h-8 w-8 border-2 border-white/30">
                    <AvatarImage src={session?.user?.image ?? undefined} alt={session?.user?.name || 'User'} />
                    <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                      {session?.user?.name ? session.user.name.split(' ').map(n => n[0]).join('') : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session?.user?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session?.user?.email ?? 'user@example.com'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
