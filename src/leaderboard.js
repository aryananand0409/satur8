import { supabase } from './supabase';

async function fetchRankTotal(totalScore) {
  const [aboveRes, totalRes] = await Promise.all([
    supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('total_score', totalScore),
    supabase
      .from('scores')
      .select('*', { count: 'exact', head: true }),
  ]);

  if (aboveRes.error || totalRes.error) return null;
  return {
    rank: (aboveRes.count ?? 0) + 1,
    total: totalRes.count ?? 0,
  };
}

export async function submitScore(totalScore) {
  const { error } = await supabase
    .from('scores')
    .insert({ total_score: totalScore });

  if (error) return null;
  return fetchRankTotal(totalScore);
}

