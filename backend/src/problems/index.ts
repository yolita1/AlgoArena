import { Problem } from '../types';
import { getApprovedProblems, getProblemById as dbGetProblem } from '../db/database';

import primesData       from './data/primes.json';
import fibonacciData    from './data/fibonacci.json';
import reverseWordsData from './data/reverse_words.json';
import gcdLcmData       from './data/gcd_lcm.json';
import palindromeData   from './data/palindrome.json';
import powerModData     from './data/power_mod.json';
import maxSubarrayData  from './data/max_subarray.json';
import fixBinaryData    from './data/fix_binary_search.json';
import twoSumData       from './data/two_sum_count.json';
import array_sumData from './data/array_sum.json';
import min_maxData from './data/min_max.json';
import selection_sortData from './data/selection_sort.json';
import linear_searchData from './data/linear_search.json';
import count_occurrencesData from './data/count_occurrences.json';
import fix_bubble_sortData from './data/fix_bubble_sort.json';
import is_palindromeData from './data/is_palindrome.json';
import binary_searchData from './data/binary_search.json';
import gcd_arrayData from './data/gcd_array.json';
import reverse_stringData from './data/reverse_string.json';
import merge_sortData from './data/merge_sort.json';
import quicksort_kthData from './data/quicksort_kth.json';
import balanced_parensData from './data/balanced_parens.json';
import tree_heightData from './data/tree_height.json';
import bfs_shortest_pathData from './data/bfs_shortest_path.json';
import coin_changeData from './data/coin_change.json';
import lcsData from './data/lcs.json';
import dijkstraData from './data/dijkstra.json';
import knapsackData from './data/knapsack.json';
import count_primesData from './data/count_primes.json';
import topo_sortData from './data/topo_sort.json';
import fib_nthData from './data/fib_nth.json';
import kth_largestData from './data/kth_largest.json';
import union_findData from './data/union_find.json';
import kmp_countData from './data/kmp_count.json';
import edit_distanceData from './data/edit_distance.json';
import lisData from './data/lis.json';
import range_sum_queriesData from './data/range_sum_queries.json';
import fix_fibonacciData from './data/fix_fibonacci.json';
import matrix_powerData from './data/matrix_power.json';
import bt_heightData from './data/bt_height.json';
import bt_nodes_depthData from './data/bt_nodes_depth.json';
import bt_mirrorData from './data/bt_mirror.json';
import bt_leavesData from './data/bt_leaves.json';
import check_bstData from './data/check_bst.json';
import bst_insertData from './data/bst_insert.json';
import bst_searchData from './data/bst_search.json';
import check_maxheapData from './data/check_maxheap.json';
import build_maxheapData from './data/build_maxheap.json';
import min_in_maxheapData from './data/min_in_maxheap.json';
import heapsort_outData from './data/heapsort_out.json';
import graph_dfs_reachData from './data/graph_dfs_reach.json';
import graph_cycleData from './data/graph_cycle.json';
import graph_bipartiteData from './data/graph_bipartite.json';
import tree_skeletonData from './data/tree_skeleton.json';
import avl_checkData from './data/avl_check.json';
import heap_find_lastData from './data/heap_find_last.json';
import heap_min_in_maxData from './data/heap_min_in_max.json';
import ternary_heap_parentData from './data/ternary_heap_parent.json';
import heap_percolate_downData from './data/heap_percolate_down.json';
import tree_diameterData from './data/tree_diameter.json';
import tree_centerData from './data/tree_center.json';
import rb_checkData from './data/rb_check.json';
import hashtbl_collisionsData from './data/hashtbl_collisions.json';
import hashtbl_resizeData from './data/hashtbl_resize.json';
import is_peigneData from './data/is_peigne.json';
import peigne_heightData from './data/peigne_height.json';
import rb_black_heightData from './data/rb_black_height.json';
import build_treeData from './data/build_tree.json';
import catalan_bstData from './data/catalan_bst.json';
import bt_right_branchData from './data/bt_right_branch.json';
import bt_same_skeletonData from './data/bt_same_skeleton.json';
import sosa_numberingData from './data/sosa_numbering.json';
import full_bt_leavesData from './data/full_bt_leaves.json';
import tree_lcns_depthData from './data/tree_lcns_depth.json';
import subtrees_depthData from './data/subtrees_depth.json';
import linked_list_palindromeData from './data/linked_list_palindrome.json';
import list_remove_valData from './data/list_remove_val.json';
import list_reverseData from './data/list_reverse.json';
import stack_opsData from './data/stack_ops.json';
import bst_predecessorData from './data/bst_predecessor.json';
import bst_delete_outputData from './data/bst_delete_output.json';
import rb_insert_countData from './data/rb_insert_count.json';
import nsi_2026_moyenneData from './data/nsi_2026_moyenne.json';
import nsi_2026_dichotomieData from './data/nsi_2026_dichotomie.json';
import nsi_2026_tri_insertionData from './data/nsi_2026_tri_insertion.json';
import nsi_2026_occurencesData from './data/nsi_2026_occurences.json';
import nsi_2026_cesarData from './data/nsi_2026_cesar.json';
import nsi_2026_palindromeData from './data/nsi_2026_palindrome.json';
import nsi_2026_maximum_listeData from './data/nsi_2026_maximum_liste.json';
import nsi_2026_notes_elevésData from './data/nsi_2026_notes_elevés.json';
import nsi_2026_fibonacci_iterData from './data/nsi_2026_fibonacci_iter.json';
import nsi_2026_convertir_baseData from './data/nsi_2026_convertir_base.json';
import nsi_2026_table_multiplicationData from './data/nsi_2026_table_multiplication.json';
import nsi_2026_anagrammeData from './data/nsi_2026_anagramme.json';
import nsi_2026_compter_voyellesData from './data/nsi_2026_compter_voyelles.json';
import nsi_2026_sous_listeData from './data/nsi_2026_sous_liste.json';
import nsi_2026_dictionnaireData from './data/nsi_2026_dictionnaire.json';
import nsi_2026_somme_chiffresData from './data/nsi_2026_somme_chiffres.json';
import nsi_2026_tableau2dData from './data/nsi_2026_tableau2d.json';
import nsi_2026_criblesData from './data/nsi_2026_cribles.json';
import nsi_2026_pile_parenthesesData from './data/nsi_2026_pile_parentheses.json';
import nsi_2026_tri_bullesData from './data/nsi_2026_tri_bulles.json';
import nsi_2026_classe_pointData from './data/nsi_2026_classe_point.json';
import nsi_2026_recursiviteData from './data/nsi_2026_recursivite.json';
import nsi_2026_graphe_degreData from './data/nsi_2026_graphe_degre.json';
import nsi_2026_pgcd_recursifData from './data/nsi_2026_pgcd_recursif.json';

const BUILTIN: Problem[] = [
  primesData, fibonacciData, reverseWordsData,
  gcdLcmData, palindromeData, powerModData,
  maxSubarrayData, fixBinaryData, twoSumData,
  array_sumData,
  min_maxData,
  selection_sortData,
  linear_searchData,
  count_occurrencesData,
  fix_bubble_sortData,
  is_palindromeData,
  binary_searchData,
  gcd_arrayData,
  reverse_stringData,
  merge_sortData,
  quicksort_kthData,
  balanced_parensData,
  tree_heightData,
  bfs_shortest_pathData,
  coin_changeData,
  lcsData,
  dijkstraData,
  knapsackData,
  count_primesData,
  topo_sortData,
  fib_nthData,
  kth_largestData,
  union_findData,
  kmp_countData,
  edit_distanceData,
  lisData,
  range_sum_queriesData,
  fix_fibonacciData,
  matrix_powerData,
  bt_heightData,
  bt_nodes_depthData,
  bt_mirrorData,
  bt_leavesData,
  check_bstData,
  bst_insertData,
  bst_searchData,
  check_maxheapData,
  build_maxheapData,
  min_in_maxheapData,
  heapsort_outData,
  graph_dfs_reachData,
  graph_cycleData,
  graph_bipartiteData,
  tree_skeletonData,
  avl_checkData,
  heap_find_lastData,
  heap_min_in_maxData,
  ternary_heap_parentData,
  heap_percolate_downData,
  tree_diameterData,
  tree_centerData,
  rb_checkData,
  hashtbl_collisionsData,
  hashtbl_resizeData,
  is_peigneData,
  peigne_heightData,
  rb_black_heightData,
  build_treeData,
  catalan_bstData,
  bt_right_branchData,
  bt_same_skeletonData,
  sosa_numberingData,
  full_bt_leavesData,
  tree_lcns_depthData,
  subtrees_depthData,
  linked_list_palindromeData,
  list_remove_valData,
  list_reverseData,
  stack_opsData,
  bst_predecessorData,
  bst_delete_outputData,
  rb_insert_countData,
  nsi_2026_moyenneData,
  nsi_2026_dichotomieData,
  nsi_2026_tri_insertionData,
  nsi_2026_occurencesData,
  nsi_2026_cesarData,
  nsi_2026_palindromeData,
  nsi_2026_maximum_listeData,
  nsi_2026_notes_elevésData,
  nsi_2026_fibonacci_iterData,
  nsi_2026_convertir_baseData,
  nsi_2026_table_multiplicationData,
  nsi_2026_anagrammeData,
  nsi_2026_compter_voyellesData,
  nsi_2026_sous_listeData,
  nsi_2026_dictionnaireData,
  nsi_2026_somme_chiffresData,
  nsi_2026_tableau2dData,
  nsi_2026_criblesData,
  nsi_2026_pile_parenthesesData,
  nsi_2026_tri_bullesData,
  nsi_2026_classe_pointData,
  nsi_2026_recursiviteData,
  nsi_2026_graphe_degreData,
  nsi_2026_pgcd_recursifData,
] as unknown as Problem[];

/** All problems: builtin + DB approved */
function allProblems(): Problem[] {
  const dbProbs = getApprovedProblems() as unknown as Problem[];
  return [...BUILTIN, ...dbProbs];
}

export function getRandomProblem(): Problem {
  const all = allProblems();
  return all[Math.floor(Math.random() * all.length)];
}

export function getProblemsForLevel(level: 'pre_bac' | 'post_bac' | 'bac_nsi' | 'all'): Problem[] {
  const all = allProblems();
  if (level === 'all') return all;
  const field = 'difficulty' as keyof Problem;
  return all.filter((p) => {
    const diff = (p as Problem & { difficulty?: string }).difficulty ?? 'pre_bac';
    return diff === level;
  });
}

export function toPublicProblem(problem: Problem) {
  const ext = problem as Problem & {
    difficulty?:  string;
    category?:    string;
    isBuggyCode?: boolean;
    buggyCode?:   { python?: string; c?: string; ocaml?: string };
  };
  return {
    id:            problem.id,
    title:         problem.title,
    description:   problem.description,
    inputSpec:     problem.inputSpec,
    outputSpec:    problem.outputSpec,
    constraints:   problem.constraints,
    exampleInput:  problem.exampleInput,
    exampleOutput: problem.exampleOutput,
    difficulty:    ext.difficulty ?? 'pre_bac',
    category:      ext.category ?? 'math',
    // Show up to 3 visible tests in the problem panel
    visibleTests:  problem.tests.filter(t => !t.hidden).slice(0, 3),
    // For Buggy Code mode: the starter code players must fix
    isBuggyCode:   ext.isBuggyCode ?? false,
    buggyCode:     ext.buggyCode ?? null,
  };
}

export { BUILTIN as problems };
