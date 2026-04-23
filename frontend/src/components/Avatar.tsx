import { DEFAULT_AVATAR } from '../defaultAvatar';
import { api } from '../api';
import { Grade } from '../types';

interface AvatarProps {
  avatar:    string | null;
  username:  string;
  size?:     number;
  className?: string;
  showRank?: boolean;
  grade?:    Grade | null;
}

export function Avatar({ avatar, username, size = 36, className = '', showRank = false, grade }: AvatarProps) {
  const url = avatar ? api.avatarUrl(avatar) : DEFAULT_AVATAR;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <img
        src={url ?? DEFAULT_AVATAR}
        alt={username}
        className={`avatar ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
      />
      {showRank && grade && (
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          background: grade.bg ?? '#0B0F17',
          border: `1px solid ${grade.color}`,
          borderRadius: 4,
          padding: '1px 4px',
          fontSize: 9,
          fontWeight: 700,
          color: grade.color,
          fontFamily: 'var(--font-title)',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
          boxShadow: `0 0 6px ${grade.glow ?? grade.color}44`,
        }}>
          {grade.icon} {grade.name}
        </div>
      )}
    </div>
  );
}

interface GradeBadgeProps {
  grade:    Grade | null;
  size?:    'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function GradeBadge({ grade, size = 'md', showIcon = true }: GradeBadgeProps) {
  if (!grade) return null;
  const sizes = { sm: { fs: '10px', pad: '2px 7px' }, md: { fs: '12px', pad: '3px 10px' }, lg: { fs: '14px', pad: '4px 14px' } };
  const s = sizes[size];
  return (
    <span
      className="grade-badge"
      style={{
        color:      grade.color,
        borderColor:grade.color + '55',
        background: grade.bg ?? (grade.color + '12'),
        fontSize:   s.fs,
        padding:    s.pad,
        textShadow: `0 0 8px ${grade.glow ?? grade.color}88`,
      }}
    >
      {showIcon && <span style={{ marginRight: 3 }}>{grade.icon}</span>}
      {grade.name}
      {grade.lp !== undefined && (
        <span style={{ opacity: 0.7, marginLeft: 5, fontWeight: 400 }}>
          {grade.lp} LP
        </span>
      )}
    </span>
  );
}

// Small inline rank pill used in player rows
export function RankPill({ grade, size = 'sm' }: { grade: Grade | null; size?: 'sm' | 'md' }) {
  if (!grade) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: size === 'sm' ? '1px 6px' : '2px 8px',
      borderRadius: 3,
      fontSize: size === 'sm' ? 9 : 11,
      fontWeight: 700,
      color: grade.color,
      background: grade.bg ?? (grade.color + '15'),
      border: `1px solid ${grade.color}44`,
      fontFamily: 'var(--font-title)',
      whiteSpace: 'nowrap',
    }}>
      {grade.icon} {grade.name}
    </span>
  );
}
