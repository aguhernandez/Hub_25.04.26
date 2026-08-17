import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, TrendingUp, Filter, Share2, Lock, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Activity {
  id: string;
  sport_type: string;
  title: string;
  notes: string | null;
  distance_km: number;
  duration_seconds: number;
  elevation_gain_m: number;
  started_at: string;
  completed_at: string;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

interface Stats {
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  totalElevation: number;
  averageSpeed: number;
}

const SPORT_TYPES = {
  run: { label: 'Run', icon: '🏃', color: 'bg-red-100 dark:bg-red-900/20' },
  trail_run: { label: 'Trail Run', icon: '🏔️', color: 'bg-orange-100 dark:bg-orange-900/20' },
  road_bike: { label: 'Road Bike', icon: '🚴', color: 'bg-blue-100 dark:bg-blue-900/20' },
  mountain_bike: { label: 'Mountain Bike', icon: '🚵', color: 'bg-green-100 dark:bg-green-900/20' },
  gravel_bike: { label: 'Gravel Bike', icon: '🛣️', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  open_water_swim: { label: 'Open Water Swim', icon: '🏊', color: 'bg-cyan-100 dark:bg-cyan-900/20' },
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function ActivityHistoryPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user]);

  useEffect(() => {
    filterActivities();
  }, [activities, selectedSport, dateRange]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Filter by sport type
    if (selectedSport !== 'all') {
      filtered = filtered.filter((a) => a.sport_type === selectedSport);
    }

    // Filter by date range
    const now = new Date();
    const rangeDate = new Date();

    if (dateRange === 'week') {
      rangeDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      rangeDate.setMonth(now.getMonth() - 1);
    }

    if (dateRange !== 'all') {
      filtered = filtered.filter((a) => new Date(a.created_at) >= rangeDate);
    }

    setFilteredActivities(filtered);

    // Calculate stats
    if (filtered.length > 0) {
      const totalDistance = filtered.reduce((sum, a) => sum + a.distance_km, 0);
      const totalDuration = filtered.reduce((sum, a) => sum + a.duration_seconds, 0);
      const totalElevation = filtered.reduce((sum, a) => sum + a.elevation_gain_m, 0);
      const averageSpeed = totalDuration > 0 ? (totalDistance / (totalDuration / 3600)) : 0;

      setStats({
        totalActivities: filtered.length,
        totalDistance,
        totalDuration,
        totalElevation,
        averageSpeed,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fdda36]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Activity History</h1>
          <p className="text-neutral-600 dark:text-neutral-400">View and manage all your recorded activities</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Activities</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.totalActivities}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Distance</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.totalDistance.toFixed(1)} km
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Duration</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {Math.floor(stats.totalDuration / 3600)}h
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">Avg Speed</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {stats.averageSpeed.toFixed(1)} km/h
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 mb-8 border border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filter:</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedSport('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedSport === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                All Sports
              </button>
              {Object.entries(SPORT_TYPES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedSport(key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedSport === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-2">
              {(['week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                    dateRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activities List */}
        <div className="space-y-3">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => {
              const sportInfo = SPORT_TYPES[activity.sport_type as keyof typeof SPORT_TYPES];
              const activityDate = new Date(activity.started_at);

              return (
                <div
                  key={activity.id}
                  className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Activity Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`${sportInfo.color} w-10 h-10 rounded-lg flex items-center justify-center text-lg`}
                        >
                          {sportInfo.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-white">
                            {activity.title}
                          </h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {activityDate.toLocaleDateString()} {activityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 ml-13">
                          {activity.notes}
                        </p>
                      )}
                    </div>

                    {/* Middle: Stats */}
                    <div className="flex gap-6 text-sm md:text-base">
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-xs mb-1">Distance</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {activity.distance_km.toFixed(1)} km
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-xs mb-1">Duration</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {formatDuration(activity.duration_seconds)}
                        </p>
                      </div>
                      {activity.elevation_gain_m > 0 && (
                        <div>
                          <p className="text-neutral-600 dark:text-neutral-400 text-xs mb-1">Elevation</p>
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {Math.round(activity.elevation_gain_m)} m
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      {activity.is_public ? (
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" title="Public" />
                      ) : (
                        <Lock className="w-5 h-5 text-neutral-400 dark:text-neutral-600" title="Private" />
                      )}
                      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                        <Share2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3 opacity-50" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-1">No activities found</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Record your first activity to get started!
              </p>
            </div>
          )}
        </div>
    </div>
  );
}
