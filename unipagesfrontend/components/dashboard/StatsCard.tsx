import { memo } from 'react';
import { Users, Activity, TrendingUp, Heart, Shield, Database, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: 'users' | 'activity' | 'trending' | 'health' | 'shield' | 'database' | 'file' | 'settings'
  className?: string
}

const iconMap = {
  users: Users,
  activity: Activity,
  trending: TrendingUp,
  health: Heart,
  shield: Shield,
  database: Database,
  file: FileText,
  settings: Settings
} as const;

// Simple fallback component for when StatsCard fails
const StatsCardFallback = memo(({ title, value, className }: { title: string; value: string; className?: string }) => (
  <div className={`bg-white overflow-hidden shadow rounded-lg p-5 ${className || ''}`}>
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>
      <div className="ml-5 w-0 flex-1">
        <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">
            {title}
          </dt>
          <dd className="text-lg font-medium text-gray-900">
            {value}
          </dd>
        </dl>
      </div>
    </div>
  </div>
));

StatsCardFallback.displayName = 'StatsCardFallback';

// Memoized change indicator component
const ChangeIndicator = memo(({ change, changeType }: { change: string; changeType: 'positive' | 'negative' | 'neutral' }) => {
  const changeColorClasses = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  return (
    <div className="bg-gray-50 px-5 py-3">
      <div className="text-sm">
        <span className={cn(
          "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-xs font-medium",
          changeColorClasses[changeType]
        )}>
          {change}
        </span>
        <span className="ml-2 text-gray-500">
          from last month
        </span>
      </div>
    </div>
  );
});

ChangeIndicator.displayName = 'ChangeIndicator';

// Memoized icon component
const StatsIcon = memo(({ icon, changeType }: { icon: 'users' | 'activity' | 'trending' | 'health' | 'shield' | 'database' | 'file' | 'settings'; changeType: 'positive' | 'negative' | 'neutral' }) => {
  const changeIconClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  };

  const IconComponent = iconMap[icon] || iconMap['users'];

  return (
    <IconComponent 
      className={cn(
        "h-6 w-6",
        changeIconClasses[changeType]
      )} 
      aria-hidden="true" 
    />
  );
});

StatsIcon.displayName = 'StatsIcon';

export const StatsCard = memo(({ title, value, change, changeType = 'neutral', icon, className }: StatsCardProps) => {
  // Validate required props
  if (!title || !value) {
    return <StatsCardFallback title={title || 'Unknown'} value={value || 'N/A'} className={className} />;
  }

  // Validate changeType
  const validChangeType = ['positive', 'negative', 'neutral'].includes(changeType) ? changeType : 'neutral';

  // Get icon component with fallback
  let iconType: keyof typeof iconMap = 'users';
  try {
    if (icon && iconMap[icon]) {
      iconType = icon;
    }
  } catch (error) {
    // Fallback to default icon on error
  }

  try {
    return (
      <div className={cn("bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow", className)}>
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <StatsIcon icon={iconType} changeType={validChangeType} />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {value}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        {change && (
          <ChangeIndicator change={change} changeType={validChangeType} />
        )}
      </div>
    );
  } catch (error) {
    return <StatsCardFallback title={title} value={value} className={className} />;
  }
});

StatsCard.displayName = 'StatsCard';
