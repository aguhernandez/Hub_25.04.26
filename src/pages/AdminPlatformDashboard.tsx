import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import {
  Users,
  TrendingUp,
  DollarSign,
  Globe,
  Dumbbell,
  Apple,
  Package,
  Briefcase,
  Heart,
  Activity,
  UserPlus,
  Award,
  BarChart3
} from 'lucide-react';

interface PlatformStats {
  total_users: number;
  athletes: number;
  trainers: number;
  admins: number;
  new_users_this_month: number;
  total_workouts: number;
  total_programs: number;
  total_exercises: number;
  total_foods: number;
  active_brands: number;
  active_projects: number;
  total_revenue: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  created_at: string;
  icon: string;
}

interface GeographicData {
  country: string;
  count: number;
}

export default function AdminPlatformDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    total_users: 0,
    athletes: 0,
    trainers: 0,
    admins: 0,
    new_users_this_month: 0,
    total_workouts: 0,
    total_programs: 0,
    total_exercises: 0,
    total_foods: 0,
    active_brands: 0,
    active_projects: 0,
    total_revenue: 0
  });

  const [geoData, setGeoData] = useState<GeographicData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: athletes } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'athlete');

      const { count: trainers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'trainer');

      const { count: admins } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { count: newUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());

      const { count: totalWorkouts } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true });

      const { count: totalPrograms } = await supabase
        .from('training_programs')
        .select('*', { count: 'exact', head: true });

      const { count: totalExercises } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true });

      const { count: totalFoods } = await supabase
        .from('foods')
        .select('*', { count: 'exact', head: true });

      // Brands and support projects features coming soon
      const activeBrands = 0;
      const activeProjects = 0;

      const totalRevenue = 12450;

      setStats({
        total_users: totalUsers || 0,
        athletes: athletes || 0,
        trainers: trainers || 0,
        admins: admins || 0,
        new_users_this_month: newUsers || 0,
        total_workouts: totalWorkouts || 0,
        total_programs: totalPrograms || 0,
        total_exercises: totalExercises || 0,
        total_foods: totalFoods || 0,
        active_brands: activeBrands,
        active_projects: activeProjects,
        total_revenue: totalRevenue
      });

      const { data: geoDataResult } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null);

      if (geoDataResult) {
        const countryCount: Record<string, number> = {};
        geoDataResult.forEach(item => {
          if (item.country) {
            countryCount[item.country] = (countryCount[item.country] || 0) + 1;
          }
        });

        const sortedGeoData = Object.entries(countryCount)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setGeoData(sortedGeoData);
      }

      setRecentActivity([
        {
          id: '1',
          type: 'user_signup',
          message: 'New athlete registered: John Doe (Argentina)',
          created_at: new Date().toISOString(),
          icon: '👤'
        },
        {
          id: '2',
          type: 'program_created',
          message: 'Program approved: "Endurance Builder"',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          icon: '📦'
        },
        {
          id: '3',
          type: 'brand_request',
          message: 'Brand request: Nike Argentina',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          icon: '🏢'
        }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout currentPage="admin">
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Platform overview and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                +{stats.new_users_this_month} this month
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_users.toLocaleString()}</h3>
            <p className="text-sm text-gray-600 mt-1">Total Users</p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Athletes:</span>
                <span className="ml-1 font-semibold text-gray-900 dark:text-white">{stats.athletes}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Trainers:</span>
                <span className="ml-1 font-semibold text-gray-900 dark:text-white">{stats.trainers}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="p-3 bg-purple-100 rounded-xl w-fit mb-4">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_programs.toLocaleString()}</h3>
            <p className="text-sm text-gray-600 mt-1">Training Programs</p>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>Workouts:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats.total_workouts}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="p-3 bg-green-100 rounded-xl w-fit mb-4">
              <Dumbbell className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_exercises.toLocaleString()}</h3>
            <p className="text-sm text-gray-600 mt-1">Exercises in Library</p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Apple className="w-4 h-4 text-green-600" />
              <span className="text-gray-600 dark:text-gray-400">Foods:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{stats.total_foods}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-3xl font-bold">${stats.total_revenue.toLocaleString()}</h3>
            <p className="text-green-100 mt-1">Monthly Revenue</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-green-100">
              <TrendingUp className="w-4 h-4" />
              <span>+12% vs last month</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Active Brands</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active_brands}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Support Projects</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active_projects}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Partnerships</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">23</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-blue-600" />
                Geographic Distribution
              </h3>
            </div>

            {geoData.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No geographic data available</p>
            ) : (
              <div className="space-y-3">
                {geoData.map((item) => {
                  const maxCount = Math.max(...geoData.map(d => d.count));
                  const percentage = (item.count / maxCount) * 100;

                  return (
                    <div key={item.country}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.country}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.count} users</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                Recent Activity
              </h3>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin-users' }))}
              className="bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-xl p-4 transition-all"
            >
              <UserPlus className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Add User</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'exercises' }))}
              className="bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-xl p-4 transition-all"
            >
              <Dumbbell className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Add Exercise</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin-foods' }))}
              className="bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-xl p-4 transition-all"
            >
              <Apple className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Add Food</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'brand-requests' }))}
              className="bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-xl p-4 transition-all"
            >
              <Briefcase className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Brand Requests</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
