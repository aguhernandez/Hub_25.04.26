import { Crown } from 'lucide-react';
import MembershipsMarketplacePage from './MembershipsMarketplacePage';

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Memberships</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Manage your subscriptions and membership plans
          </p>
        </div>

        {/* Content */}
        <MembershipsMarketplacePage />
      </div>
    </div>
  );
}
