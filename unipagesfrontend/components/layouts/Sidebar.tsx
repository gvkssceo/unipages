'use client'

import { memo, useMemo, useCallback, useState } from 'react';
import {
  Users,
  Shield,
  Settings,
  UserCheck,
  X,
  Home,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home, roles: ['admin'] },
  { name: 'Roles', href: '/admin/roles', icon: Shield, roles: ['admin'] },
  { name: 'Permission Sets', href: '/admin/permission-sets', icon: Settings, roles: ['admin'] },
  { name: 'Profiles', href: '/admin/profiles', icon: UserCheck, roles: ['admin'] },
  { name: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
] as const;

// Memoized search input component
const SearchInput = memo(({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (query: string) => void }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
      <Search className="h-4 w-4" />
    </span>
    <input
      type="text"
      placeholder="Quick Find"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full h-10 rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/40 focus:border-[#0070d2]"
      aria-label="Quick Find"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
));

SearchInput.displayName = 'SearchInput';

// Memoized navigation item component
const NavigationItem = memo(({ item, isActive, onClick, collapsed }: { 
  item: typeof navigation[number]; 
  isActive: boolean; 
  onClick: () => void;
  collapsed: boolean;
}) => (
  <li key={item.name}>
    <Link
      href={item.href}
      className={cn(
        isActive
          ? 'bg-[#eaf2fb] text-[#0070d2] border-l-4 border-[#0070d2]' 
          : 'text-gray-900 hover:bg-gray-100',
        'flex items-center gap-x-3 rounded-r-md p-3 text-sm font-medium transition-colors',
        collapsed ? 'justify-center' : ''
      )}
      onClick={onClick}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn('h-4 w-4', 
        isActive ? 'text-[#0070d2]' : 'text-gray-400'
      )} />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  </li>
));

NavigationItem.displayName = 'NavigationItem';

// Memoized mobile sidebar overlay
const MobileSidebarOverlay = memo(({ open, setOpen, searchQuery, setSearchQuery }: {
  open: boolean;
  setOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-gray-900/80" />
      <div className="fixed inset-0 flex">
        <div className="relative mr-16 flex w-full max-w-xs flex-1">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <button
                onClick={() => setOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => {
                      const isDashboard = item.href === '/admin'
                      const active = isDashboard
                        ? false // We'll handle this in the main component
                        : false
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              active
                                ? 'bg-gray-50 text-primary'
                                : 'text-gray-700 hover:text-primary hover:bg-gray-50',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                            onClick={() => setOpen(false)}
                          >
                            <item.icon
                              className={cn(
                                active
                                  ? 'text-primary'
                                  : 'text-gray-400 group-hover:text-primary',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
});

MobileSidebarOverlay.displayName = 'MobileSidebarOverlay';

export const Sidebar = memo(({ open, setOpen, collapsed, setCollapsed }: SidebarProps) => {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  // Memoized search filtering logic
  const filteredNavigation = useMemo(() => {
    if (!searchQuery.trim()) return navigation
    
    const query = searchQuery.toLowerCase()
    return navigation.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.href.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Memoized show setup home logic
  const showSetupHome = useMemo(() => {
    return !searchQuery.trim() || 
      'Dashboard'.toLowerCase().includes(searchQuery.toLowerCase())
  }, [searchQuery]);

  // Memoized filtered other items
  const filteredOtherItems = useMemo(() => {
    if (!searchQuery.trim()) return navigation.slice(1)
    
    const query = searchQuery.toLowerCase()
    return navigation.slice(1).filter(item => {
      const name = item.name.toLowerCase()
      const href = item.href.toLowerCase()
      
      // Direct text matching
      if (name.includes(query) || href.includes(query)) return true
      
      // Common abbreviations and synonyms
      const searchTerms = {
        'user': ['users', 'user management', 'people', 'accounts'],
        'role': ['roles', 'permissions', 'access control'],
        'profile': ['profiles', 'user profiles', 'settings'],
        'permission': ['permissions', 'access', 'rights', 'privileges'],
        'activity': ['activities', 'logs', 'history', 'audit'],
        'database': ['db', 'tables', 'data', 'records'],
        'report': ['reports', 'analytics', 'insights', 'data']
      }
      
      // Check if query matches any search terms
      for (const [key, synonyms] of Object.entries(searchTerms)) {
        if (key.includes(query) || synonyms.some(syn => syn.includes(query))) {
          if (name.includes(key) || synonyms.some(syn => name.includes(syn))) {
            return true
          }
        }
      }
      
      return false
    })
  }, [searchQuery])

  // Memoized close handler
  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  return (
    <>
      {/* Mobile sidebar overlay */}
      <MobileSidebarOverlay 
        open={open} 
        setOpen={setOpen} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Desktop sidebar - Salesforce Setup-style */}
      <div className="hidden lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-30 lg:flex lg:flex-row">
        <div className={cn(
          "hidden lg:flex lg:flex-col border-r border-gray-200 bg-[#f8f9fa] overflow-y-auto transition-all duration-300",
          collapsed ? "w-16 px-2" : "w-60 px-4"
        )}>
          {/* Collapse/Expand button */}
          <div className="pt-6 flex justify-end">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "p-2 rounded-md hover:bg-gray-200 transition-colors",
                collapsed ? "mx-auto" : "ml-auto"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Quick Find search - Hide when collapsed */}
          {!collapsed && (
            <div className="pt-2">
              <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>
          )}

          {/* Navigation sections */}
          <div className="mt-8">
            {/* Setup Home - Show if matches search or no search */}
            {showSetupHome && (
              <div className="mb-6">
                <NavigationItem
                  item={navigation[0]}
                  isActive={pathname === '/admin'}
                  onClick={handleClose}
                  collapsed={collapsed}
                />
              </div>
            )}

            {/* Administration section */}
            <div className="mb-4">
              {!collapsed && (
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-3 mb-2">
                  Administration
                </div>
              )}
              <nav>
                <ul className="space-y-1">
                  {filteredOtherItems.map((item) => {
                    const active = pathname === item.href
                    return (
                      <NavigationItem
                        key={item.name}
                        item={item}
                        isActive={active}
                        onClick={handleClose}
                        collapsed={collapsed}
                      />
                    )
                  })}
                </ul>
              </nav>
              
              {/* Show message when no results found - Hide when collapsed */}
              {!collapsed && searchQuery && filteredOtherItems.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
});

Sidebar.displayName = 'Sidebar';
