import { supabase } from './supabase';

async function fetchRankTotal(totalScore, table) {
  const [aboveRes, totalRes] = await Promise.all([
    supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .gt('total_score', totalScore),
    supabase
      .from(table)
      .select('*', { count: 'exact', head: true }),
  ]);

  if (aboveRes.error || totalRes.error) return null;
  return {
    rank: (aboveRes.count ?? 0) + 1,
    total: totalRes.count ?? 0,
  };
}

export async function submitScore(totalScore, mode = 'classic') {
  const table = mode === 'hard' ? 'scores_hard' : 'scores';
  const { error } = await supabase
    .from(table)
    .insert({ total_score: totalScore });

  if (error) return null;
  return fetchRankTotal(totalScore, table);
}

