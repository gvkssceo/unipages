import { APP_NAME, APP_NAME_SHORT, APP_NAME_LONG } from '@/lib/config';

interface AppNameProps {
  variant?: 'default' | 'short' | 'long';
  className?: string;
  showYear?: boolean;
}

export function AppName({ 
  variant = 'default', 
  className = '',
  showYear = false 
}: AppNameProps) {
  const getDisplayName = () => {
    switch (variant) {
      case 'short':
        return APP_NAME_SHORT;
      case 'long':
        return APP_NAME_LONG;
      default:
        return APP_NAME;
    }
  };

  const displayName = getDisplayName();
  const year = showYear ? new Date().getFullYear() : '';

  return (
    <span className={className}>
      {displayName}
      {showYear && year && ` ${year}`}
    </span>
  );
}

// Export individual components for specific use cases
export function AppNameShort({ className = '' }: { className?: string }) {
  return <AppName variant="short" className={className} />;
}

export function AppNameLong({ className = '' }: { className?: string }) {
  return <AppName variant="long" className={className} />;
}

// Default export
export default AppName;
