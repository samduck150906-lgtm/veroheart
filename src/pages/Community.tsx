// @ts-nocheck
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, MessageCircle, ThumbsUp, CheckCircle2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = ['전체', '사료추천', '집사꿀팁', '수의사 Q&A', '잡담'];

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  '수의사 Q&A': { bg: 'rgba(49,130,246,0.10)', color: '#1D4ED8' },
  '사료추천':   { bg: 'var(--brand-tint)',      color: 'var(--brand-deep)' },
  '집사꿀팁':   { bg: '#F0FDE8',               color: '#3A7D1C' },
  '잡담':       { bg: 'var(--fill)',             color: 'var(--ink-soft)' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function PostCard({ post, onLike }: { post: Post; onLike: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const CLAMP_CHARS = 120;
  const needsClamp = post.content.length > CLAMP_CHARS;
  const displayContent = needsClamp && !expanded
    ? post.content.slice(0, CLAMP_CHARS) + '…'
    : post.content;

  const cs = CATEGORY_STYLE[post.category] ?? { bg: 'var(--fill)', color: 'var(--ink-soft)' };

  return (
    <article style={{
      background: '#fff',
      borderRadius: '20px',
      border: '1px solid var(--hairline)',
      padding: '18px',
    }}>
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={post.author.avatar}
            alt={post.author.name}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover',
              border: post.author.isVet ? '2px solid var(--brand)' : '1px solid var(--hairline)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                {post.author.name}
              </span>
              {post.author.isVet && (
                <CheckCircle2 size={13} fill="var(--brand-deep)" color="#fff" />
              )}
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '5px',
                background: post.author.petType === 'cat' ? '#EFF6FF' : '#FEF3C7',
                color: post.author.petType === 'cat' ? '#1D4ED8' : '#D97706',
              }}>
                {post.author.petType === 'cat' ? '묘주' : '견주'}
              </span>
            </div>
            {post.author.badge && (
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '1px' }}>
                {post.author.badge}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 500 }}>{post.time}</span>
      </div>

      {/* Category badge */}
      <span style={{
        display: 'inline-block', fontSize: '10px', fontWeight: 800,
        padding: '3px 8px', borderRadius: '6px', marginBottom: '10px',
        background: cs.bg, color: cs.color,
      }}>
        {post.category}
      </span>

      {/* Title */}
      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.4, marginBottom: '8px' }}>
        {post.title}
      </div>

      {/* Content with expand/collapse */}
      <div>
        <p style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
          {displayContent}
        </p>
        {needsClamp && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, color: 'var(--brand-deep)', padding: 0,
            }}
          >
            {expanded ? <><ChevronUp size={13} /> 접기</> : <><ChevronDown size={13} /> 더 보기</>}
          </button>
        )}
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--hairline)', margin: '14px 0 12px' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '18px' }}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: '12px', fontWeight: 700,
            color: post.hasLiked ? '#E04452' : 'var(--ink-faint)',
            transition: 'color 0.15s',
          }}
        >
          <ThumbsUp size={14} fill={post.hasLiked ? '#E04452' : 'none'} color={post.hasLiked ? '#E04452' : 'var(--ink-faint)'} strokeWidth={2.2} />
          {post.likes}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>
          <MessageSquare size={14} strokeWidth={2.2} />
          {post.commentsCount}
        </div>
      </div>
    </article>
  );
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('집사꿀팁');

  const handleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, likes: p.hasLiked ? p.likes - 1 : p.likes + 1, hasLiked: !p.hasLiked } : p
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const post: Post = {
      id: Date.now().toString(),
      author: { name: '행복한 집사', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120', badge: '뉴비집사', petType: 'dog' },
      category: newCategory,
      title: newTitle,
      content: newContent,
      tags: ['베로로커뮤니티'],
      likes: 1,
      commentsCount: 0,
      time: '방금 전',
      hasLiked: true,
    };
    setPosts(prev => [post, ...prev]);
    setNewTitle('');
    setNewContent('');
    setIsWriteOpen(false);
  };

  const filtered = selectedCategory === '전체' ? posts : posts.filter(p => p.category === selectedCategory);

  return (
    <div style={{ paddingBottom: '96px' }}>
      <Helmet>
        <title>랜선애카 — 베로로</title>
        <meta name="description" content="집사들의 사료 이야기, 수의사 Q&A, 키우기 꿀팁을 나눠요." />
      </Helmet>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' }}>랜선애카</div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '2px' }}>먹이고, 키우고, 나누는 이야기</div>
        </div>
        <span style={{ width: '44px', height: '44px', borderRadius: '13px', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={22} strokeWidth={2.2} color="var(--brand-deep)" />
        </span>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '14px', scrollbarWidth: 'none', marginBottom: '4px' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
              background: selectedCategory === cat ? 'var(--ink)' : 'var(--fill)',
              color: selectedCategory === cat ? '#fff' : 'var(--ink-soft)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Write CTA */}
      <button
        onClick={() => setIsWriteOpen(o => !o)}
        style={{
          width: '100%', height: '50px', margin: '8px 0 16px',
          borderRadius: '14px', background: 'var(--brand)', color: 'var(--ink-on-brand)',
          border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          boxShadow: '0 6px 16px rgba(255, 201, 40, 0.28)',
        }}
      >
        <Pencil size={17} strokeWidth={2.4} /> 글쓰기
      </button>

      {/* Write form — animated slide-down */}
      <div style={{
        overflow: 'hidden',
        maxHeight: isWriteOpen ? '420px' : '0px',
        opacity: isWriteOpen ? 1 : 0,
        transition: 'max-height 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease',
        marginBottom: isWriteOpen ? '18px' : '0',
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#fff', borderRadius: '18px',
            border: '1px solid var(--hairline)',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>새 글 작성</span>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{
                fontSize: '12px', fontWeight: 700, padding: '5px 10px',
                borderRadius: '9px', border: '1px solid var(--hairline)',
                background: 'var(--fill)', color: 'var(--ink-soft)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="사료추천">사료추천</option>
              <option value="집사꿀팁">집사꿀팁</option>
              <option value="잡담">잡담</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="제목을 입력해주세요"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            required
            style={{
              width: '100%', padding: '11px 13px', borderRadius: '11px',
              border: '1px solid var(--hairline)', background: 'var(--fill)',
              fontSize: '13px', fontWeight: 700, color: 'var(--ink)',
              outline: 'none', marginBottom: '10px', boxSizing: 'border-box',
            }}
          />

          <textarea
            placeholder="성분 분석 경험담이나 사료에 관련된 고민을 적어주세요"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            required
            rows={4}
            style={{
              width: '100%', padding: '11px 13px', borderRadius: '11px',
              border: '1px solid var(--hairline)', background: 'var(--fill)',
              fontSize: '13px', fontWeight: 500, color: 'var(--ink)',
              outline: 'none', resize: 'none', lineHeight: 1.55,
              marginBottom: '14px', boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsWriteOpen(false)}
              style={{
                flex: 1, padding: '13px', borderRadius: '12px',
                border: '1px solid var(--hairline)', background: '#fff',
                fontSize: '13px', fontWeight: 700, color: 'var(--ink-soft)', cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                flex: 2, padding: '13px', borderRadius: '12px',
                background: 'var(--brand)', color: 'var(--ink-on-brand)',
                border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              등록하기
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>
            이 카테고리에는 아직 글이 없어요.<br />첫 글의 주인공이 되어보세요!
          </div>
        ) : (
          filtered.map(post => (
            <PostCard key={post.id} post={post} onLike={handleLike} />
          ))
        )}
      </div>
    </div>
  );
}
