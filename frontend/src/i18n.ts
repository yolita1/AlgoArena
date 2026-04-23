// ─── Language detection ────────────────────────────────────────────────────────
function detectLang(): 'fr' | 'en' {
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const LANG: 'fr' | 'en' = detectLang();
export const isFr = LANG === 'fr';

// ─── Translations ──────────────────────────────────────────────────────────────
const T = {
  // Nav
  arena:          { fr: 'Arène',        en: 'Arena' },
  library:        { fr: 'Bibliothèque', en: 'Library' },
  ranks:          { fr: 'Classement',   en: 'Leaderboard' },
  clans:          { fr: 'Clans',        en: 'Clans' },
  submit:         { fr: 'Soumettre',    en: 'Submit' },
  admin:          { fr: 'Admin',        en: 'Admin' },

  // Home
  tagline:        { fr: 'Code. Affronte. Grimpe.', en: 'Code. Compete. Dominate.' },
  enterArena:     { fr: 'ENTRER',                  en: 'ENTER ARENA' },
  enterRoom:      { fr: 'ENTRER DANS LA SALLE',    en: 'ENTER ROOM' },
  quickMatch:     { fr: 'Partie rapide',            en: 'Quick Match' },
  createRoom:     { fr: 'Créer une salle',          en: 'Create Room' },
  joinByCode:     { fr: 'Rejoindre (code)',         en: 'Join by Code' },
  levelLabel:     { fr: 'Niveau des problèmes',     en: 'Problem difficulty' },
  allLevels:      { fr: 'Tous',                     en: 'All' },
  preBac:         { fr: 'Lycée / Pré-Bac',          en: 'Pre-Bac' },
  postBac:        { fr: 'Prépa / Post-Bac',         en: 'Post-Bac' },
  levelHint:      { fr: 'Filtre les problèmes proposés en partie', en: 'Filters which problems appear in game' },
  shareCode:      { fr: 'Partage ce code avec tes amis', en: 'Share this code with friends' },
  yourName:       { fr: 'Ton pseudo (optionnel)',   en: 'Your name (optional)' },
  roomCode:       { fr: 'CODE DE SALLE',            en: 'ROOM CODE' },

  // Lobby
  autoStart:      { fr: 'Départ automatique dans…', en: 'Auto-starting in…' },
  allReady:       { fr: 'Tout le monde est prêt !', en: 'Everyone is ready!' },
  waitingPlayers: { fr: 'En attente des joueurs…',  en: 'Waiting for players…' },
  ready:          { fr: 'Prêt',                     en: 'Ready' },
  cancelReady:    { fr: 'Annuler',                  en: 'Cancel' },
  leave:          { fr: 'Quitter',                  en: 'Leave' },
  waiting:        { fr: 'En attente…',              en: 'Waiting…' },
  you:            { fr: 'toi',                      en: 'you' },
  bot:            { fr: 'bot',                      en: 'bot' },

  // Game
  problem:        { fr: 'Problème',   en: 'Problem' },
  example:        { fr: 'Exemple',    en: 'Example' },
  players:        { fr: 'Joueurs',    en: 'Players' },
  runTests:       { fr: '▶ Tester',   en: '▶ Run' },
  submitCode:     { fr: '⚡ Soumettre', en: '⚡ Submit' },
  submitted:      { fr: '✓ Soumis',   en: '✓ Done' },
  judging:        { fr: '⏳ Jugement…', en: '⏳ Judging…' },
  running:        { fr: '⏳ Exécution…', en: '⏳ Running…' },
  runPrompt:      { fr: '→ Tester ou soumettre pour voir les résultats', en: '→ Run or Submit to see results' },
  coding:         { fr: 'en cours…',  en: 'coding…' },
  chat:           { fr: 'Chat',       en: 'Chat' },
  chatPlaceholder:{ fr: 'message…',   en: 'chat…' },
  input:          { fr: 'Entrée',     en: 'Input' },
  output:         { fr: 'Sortie',     en: 'Output' },
  inputSpec:      { fr: 'Entrée :',   en: 'Input:' },
  outputSpec:     { fr: 'Sortie :',   en: 'Output:' },
  constraints:    { fr: 'Contraintes :', en: 'Constraints:' },
  round:          { fr: 'Manche',     en: 'Round' },
  dnf:            { fr: 'Abandon',    en: 'DNF' },

  // Podium
  finalResults:   { fr: 'RÉSULTATS FINALS', en: 'FINAL RESULTS' },
  roundResults:   { fr: 'RÉSULTATS MANCHE', en: 'ROUND RESULTS' },
  nextRound:      { fr: '⏱ Prochaine manche dans quelques secondes…', en: '⏱ Next round starting soon…' },
  playAgain:      { fr: 'Rejouer',     en: 'Play Again' },
  revenge:        { fr: '😈 Revanche', en: '😈 Revenge' },
  viewCode:       { fr: 'voir code',   en: 'view code' },
  session:        { fr: 'Session',     en: 'Session' },

  // Profile
  signIn:         { fr: 'Connexion',   en: 'Sign In' },
  register:       { fr: 'Inscription', en: 'Register' },
  logout:         { fr: 'Déconnexion', en: 'Logout' },
  editProfile:    { fr: 'Modifier',    en: 'Edit' },
  save:           { fr: 'Sauvegarder', en: 'Save' },
  cancel:         { fr: 'Annuler',     en: 'Cancel' },
  establishment:  { fr: 'Établissement', en: 'School / University' },
  estPlaceholder: { fr: 'Lycée, Prépa, Université…', en: 'School, Prep, University…' },
  level:          { fr: 'Niveau',      en: 'Level' },
  wins:           { fr: 'Victoires',   en: 'Wins' },
  winrate:        { fr: 'Win rate',    en: 'Win rate' },
  streak:         { fr: 'Série',       en: 'Streak' },
  fastest:        { fr: 'Plus rapide', en: 'Fastest' },
  badges:         { fr: 'Badges',      en: 'Badges' },
  pinnedBadges:   { fr: 'Badges affichés (3 max)', en: 'Displayed badges (max 3)' },
  gradeProgress:  { fr: 'Progression', en: 'Progress' },
  pointsToNext:   { fr: 'LP pour passer à', en: 'LP to reach' },
  topPercent:     { fr: 'Top',         en: 'Top' },

  // Library
  allProblems:    { fr: 'Tous les problèmes', en: 'All Problems' },
  searchProblems: { fr: 'Chercher un problème…', en: 'Search problems…' },
  category:       { fr: 'Catégorie',  en: 'Category' },
  allCategories:  { fr: 'Toutes',     en: 'All categories' },
  submitProblem:  { fr: '+ Proposer', en: '+ Submit' },
  practiceBtn:    { fr: 'Pratiquer →', en: 'Practice →' },
  plays:          { fr: 'parties',    en: 'plays' },
  notLoggedIn:    { fr: 'Connecte-toi pour soumettre des problèmes', en: 'Sign in to submit problems' },

  // Leaderboard (intentionally kept as-is for universality)
  leaderboard:    { fr: 'Leaderboard', en: 'Leaderboard' },
  allTime:        { fr: 'Global',     en: 'All Time' },
  weekly:         { fr: 'Semaine',    en: 'This Week' },
  monthly:        { fr: 'Mois',       en: 'This Month' },
  playersTab:     { fr: 'Joueurs',    en: 'Players' },
  establishmentsTab:{ fr: 'Établissements', en: 'Schools' },
  clansTab:       { fr: 'Clans',      en: 'Clans' },

  // Clans
  createClan:     { fr: 'Créer un clan', en: 'Create Clan' },
  joinClan:       { fr: 'Rejoindre',  en: 'Join' },
  leaveClan:      { fr: 'Quitter le clan', en: 'Leave Clan' },
  noClans:        { fr: 'Aucun clan encore. Sois le premier !', en: 'No clans yet. Be the first!' },
  members:        { fr: 'membres',    en: 'members' },

  // Submit problem
  submitTitle:    { fr: '📝 Proposer un problème', en: '📝 Submit Problem' },
  submitHint:     { fr: 'Les problèmes sont vérifiés par un admin avant publication.', en: 'Problems go through admin review before appearing in the library.' },
  addTest:        { fr: '+ Ajouter un test', en: '+ Add Test' },
  hidden:         { fr: 'Caché',      en: 'Hidden' },
  submitBtn:      { fr: 'Soumettre pour validation', en: 'Submit for Review' },

  // Admin
  adminTitle:     { fr: '⚠ Panneau Admin', en: '⚠ Admin Panel' },
  pending:        { fr: 'Problèmes en attente', en: 'Pending Problems' },
  approve:        { fr: 'Approuver',  en: 'Approve' },
  reject:         { fr: 'Rejeter',    en: 'Reject' },
  ban:            { fr: 'Bannir',     en: 'Ban' },
  unban:          { fr: 'Débannir',   en: 'Unban' },
  usersTitle:     { fr: 'Utilisateurs', en: 'Users' },
  searchUsers:    { fr: 'Rechercher…', en: 'Search users…' },
};

export function t(key: keyof typeof T): string {
  const entry = T[key];
  if (!entry) return key;
  return isFr ? entry.fr : entry.en;
}

// Mode labels (bilingual)
export const MODE_LABELS_I18N: Record<string, { fr: string; en: string }> = {
  normal:        { fr: 'Normal',          en: 'Normal' },
  duel_1v1:      { fr: '1v1 Duel',        en: '1v1 Duel' },
  best_of_5:     { fr: 'Best of 5',       en: 'Best of 5' },
  panic:         { fr: 'Panique (30s)',    en: 'Panic (30s)' },
  buggy_code:    { fr: 'Code Bugué',      en: 'Buggy Code' },
  sudden_death:  { fr: 'Mort Subite',     en: 'Sudden Death' },
  hyper_rush:    { fr: 'Hyper Rush',      en: 'Hyper Rush' },
  battle_royale: { fr: 'Battle Royale',   en: 'Battle Royale' },
  team_2v2:      { fr: '2v2',             en: '2v2' },
  king_of_hill:  { fr: 'Roi de la Colline', en: 'King of the Hill' },
};

export function modeLabel(mode: string): string {
  const m = MODE_LABELS_I18N[mode];
  if (!m) return mode;
  return isFr ? m.fr : m.en;
}
