import { useState, useEffect, useCallback } from 'react';
import { Stats } from '../types';
import { API_ENDPOINTS } from '../constants/api';
import { TIMING } from '../constants/timing';

export function useStats() {
  const [stats, setStats] = useState<Stats>({});

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.STATS);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const intervalId = window.setInterval(loadStats, TIMING.STATS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStats]);

  return { stats, refreshStats: loadStats };
}
