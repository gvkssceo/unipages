'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AppName } from '@/components/ui/AppName';
import PerformanceMonitor from '@/components/PerformanceMonitor';

const tabs = [
  "Summary",
  "KPIs",
  "Activity & Audit",
  "Tasks & Reviews",
  "System Health",
  "Quick Actions",
  "Help & Docs",
];

const stats = [
  { label: "Total Users", value: 1248, trend: "+3.2%", trendType: "up" },
  { label: "Active (7d)", value: 476, trend: "+1.1%", trendType: "up" },
  { label: "New (30d)", value: 138, trend: "+6.0%", trendType: "up" },
  { label: "Failed Logins (24h)", value: 9, trend: "-12%", trendType: "down" },
];

const activities = [
  { icon: "👤", text: "Invited user john@acme.com", time: "2m ago" },
  { icon: "🛡️", text: "Role updated: City Manager", time: "17m ago" },
  { icon: "🔒", text: "Permission set edited: Listings:Write", time: "1h ago" },
  { icon: "⚠️", text: "3 failed logins from 52.12.16.3", time: "3h ago" },
];

const tasks = [
  { text: "Approve access for Priya (Category Manager)", priority: "Medium", due: "Today" },
  { text: "Review expiring temp permission: Listings:Write", priority: "High", due: "In 2 days" },
  { text: "Revoke access – Former contractor", priority: "Low", due: "In 5 days" },
];

const prioritiesColors: Record<string, string> = {
  High: "bg-red-200 text-red-700",
  Medium: "bg-yellow-200 text-yellow-700",
  Low: "bg-gray-200 text-gray-700",
};

const kpiData = [
  { title: "Revenue", value: "$25,000", change: "+5%" },
  { title: "Conversion Rate", value: "3.8%", change: "+0.2%" },
  { title: "Customer Satisfaction", value: "89%", change: "+1%" },
];

const auditLogs = [
  "User Jane updated permissions",
  "Role Admin created",
  "API key revoked for service X",
];

const quickActions = [
  "Create new user",
  "Reset password",
  "Generate report",
];

function renderSummary() {
  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, trend, trendType }) => (
          <div
            key={label}
            className="bg-white p-4 rounded-lg shadow flex flex-col space-y-1"
          >
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div
              className={`inline-flex items-center text-xs font-semibold rounded px-2 py-1 w-max ${
                trendType === "up"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {trendType === "up" ? "⬆️" : "⬇️"} {trend}
        </div>
      </div>
    ))}
  </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            <button className="text-sm text-blue-600 hover:underline">
              Open audit
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Latest important changes and security events
          </p>
          <ul className="space-y-3 text-gray-700 text-sm">
            {activities.map(({ icon, text, time }, i) => (
              <li key={i} className="flex items-center space-x-2">
                <span>{icon}</span>
                <span>{text}</span>
                <span className="ml-auto text-xs text-gray-400">{time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-800">My Tasks</h2>
            <button className="text-sm text-blue-600 hover:underline">View all</button>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Approvals and reviews assigned to you
          </p>
          <ul className="space-y-4 text-sm text-gray-700">
            {tasks.map(({ text, priority, due }, i) => (
              <li key={i} className="flex flex-col space-y-1">
                <div className="flex justify-between items-center">
                  <span>{text}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      prioritiesColors[priority]
                    }`}
                  >
                    {priority}
                  </span>
      </div>
                <div className="text-xs text-gray-400">Due: {due}</div>
              </li>
            ))}
          </ul>
      </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-800 mb-2">System Status</h2>
          <p className="text-xs text-gray-500 mb-4">Key services and uptime</p>
          <div className="flex flex-wrap gap-4 text-xs">
            {["Auth", "Admin API", "DB", "Email"].map((service) => (
              <div
                key={service}
                className="flex flex-col items-center p-2 rounded border border-gray-200 w-24"
              >
                <span className="font-semibold">{service}</span>
                <span className="text-green-600 text-sm">Operational</span>
              </div>
            ))}
                            </div>
                          </div>
                        </div>
    </>
  );
}

function renderKPIs() {
        return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold mb-4">KPIs Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {kpiData.map(({ title, value, change }) => (
          <div
            key={title}
            className="p-4 border rounded-lg flex flex-col items-center"
          >
            <div className="text-sm text-gray-600">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-green-600 font-semibold">{change}</div>
          </div>
        ))}
      </div>
          </div>
        );
      }

function renderActivityAudit() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Activity & Audit Logs</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-700">
        {auditLogs.map((log, i) => (
          <li key={i}>{log}</li>
        ))}
      </ul>
    </div>
  );
}

function renderTasksReviews() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Tasks & Reviews</h2>
      <p className="text-gray-600">Here you can manage your tasks and reviews.</p>
      {/* You can reuse the tasks list or make more detailed UI */}
      <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
        {tasks.map(({ text, priority, due }, i) => (
          <li key={i}>
            {text} - <strong>{priority}</strong> priority, due {due}
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderSystemHealth() {
  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Cache cleared successfully! Cleared ${result.clearedCount} cache entries in ${result.clearTime}ms`);
      } else {
        alert('Failed to clear cache. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache. Please check console for details.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">System Health</h2>
      <p className="text-gray-600 mb-4">
        Overview of system uptime, performance, and alerts.
      </p>
      
      {/* System Metrics */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-3">System Metrics</h3>
        <ul className="space-y-2 text-gray-700">
          <li>CPU Usage: 45%</li>
          <li>Memory Usage: 68%</li>
          <li>Disk Space: 72% used</li>
          <li>Network Latency: 120ms</li>
        </ul>
      </div>

      {/* Cache Management */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-3">Cache Management</h3>
        <p className="text-sm text-gray-600 mb-3">
          Clear server-side caches to ensure fresh data and resolve performance issues.
        </p>
        <button
          onClick={handleClearCache}
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition text-sm"
        >
          Clear All Caches
        </button>
        <p className="text-xs text-gray-500 mt-2">
          This will clear users, roles, profiles, and permission sets caches.
        </p>
      </div>
    </div>
  );
}

function renderQuickActions() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {action}
          </button>
        ))}
                  </div>
                </div>
  );
}

function renderHelpDocs() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Help & Documentation</h2>
      <p className="text-gray-600 mb-4">
        Find answers and documentation to help you use the system.
      </p>
      <ul className="list-disc list-inside text-blue-600 space-y-2">
        <li>
          <a href="#" className="hover:underline">
            User Guide
          </a>
        </li>
        <li>
          <a href="#" className="hover:underline">
            API Documentation
          </a>
        </li>
        <li>
          <a href="#" className="hover:underline">
            Support Center
          </a>
        </li>
      </ul>
                      </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Summary");
  const [isTabLoading, setIsTabLoading] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === activeTab) return; // Don't reload if same tab
    
    setIsTabLoading(true);
    setActiveTab(tab);
    
    // Reset loading state after a short delay
    const timeoutId = setTimeout(() => {
      setIsTabLoading(false);
    }, 300);
    
    // Cleanup timeout on unmount or tab change
    return () => clearTimeout(timeoutId);
  }, [activeTab]);

  const renderTabContent = (activeTab: string) => {
    switch (activeTab) {
      case "Summary":
        return renderSummary();
      case "KPIs":
        return renderKPIs();
      case "Activity & Audit":
        return renderActivityAudit();
      case "Tasks & Reviews":
        return renderTasksReviews();
      case "System Health":
        return renderSystemHealth();
      case "Quick Actions":
        return renderQuickActions();
      case "Help & Docs":
        return renderHelpDocs();
      default:
        return <div>Select a tab to view content.</div>;
    }
  };

  useEffect(() => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 bg-gray-50 min-h-screen font-sans">
        {/* Tabs */}
        <div className="flex space-x-3 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 bg-blue-100 text-blue-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {isTabLoading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-muted-foreground">Loading {activeTab}...</p>
            </div>
          </div>
        ) : (
          renderTabContent(activeTab)
        )}
      </div>
      
      {/* Performance Monitor (Development only) */}
      <PerformanceMonitor />
    </DashboardLayout>
  );
}
