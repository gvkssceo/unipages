import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SalesforceContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  className?: string
  showBorder?: boolean
}

export function SalesforceContainer({ 
  children, 
  title, 
  subtitle, 
  className,
  showBorder = true 
}: SalesforceContainerProps) {
  return (
    <div className={cn(
      "bg-white",
      showBorder && "border border-gray-200 rounded-lg",
      className
    )}>
      {/* Header section */}
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          {title && (
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Content section */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// Table container specifically for Salesforce-style tables
export function SalesforceTableContainer({ 
  children, 
  title, 
  subtitle, 
  className 
}: SalesforceContainerProps) {
  return (
    <SalesforceContainer 
      title={title} 
      subtitle={subtitle} 
      className={cn("", className)}
      showBorder={true}
    >
      {children}
    </SalesforceContainer>
  )
}

// Form container for Salesforce-style forms
export function SalesforceFormContainer({ 
  children, 
  title, 
  subtitle, 
  className 
}: SalesforceContainerProps) {
  return (
    <SalesforceContainer 
      title={title} 
      subtitle={subtitle} 
      className={className}
      showBorder={true}
    >
      <div className="space-y-6">
        {children}
      </div>
    </SalesforceContainer>
  )
}

// Card container for Salesforce-style cards
export function SalesforceCardContainer({ 
  children, 
  title, 
  subtitle, 
  className 
}: SalesforceContainerProps) {
  return (
    <SalesforceContainer 
      title={title} 
      subtitle={subtitle} 
      className={cn("shadow-sm", className)}
      showBorder={true}
    >
      {children}
    </SalesforceContainer>
  )
}
