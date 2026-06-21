// @ts-nocheck
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, MessageCircle, ThumbsUp, CheckCircle2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { COMMUNITY_WRITE } from '../copy/ui';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    badge?: string;
    isVet?: boolean;
    petType: 'dog' | 'cat';
  };
  category: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  time: string;
  hasLiked?: boolean;
}

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    author: {
      name: '초코엄마',
      avatar: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=120',
      badge: '파워집사 3기',
      petType: 'dog',
    },
    category: '사료추천',
    title: '눈물 자국 심했던 말티즈 사료 유목민 탈출한 후기',
    content: '초코가 어릴 때부터 눈물이 너무 많아서 얼굴 털이 항상 젖어있고 냄새도 심했어요. 웬만한 가수분해 사료는 다 먹여봤는데도 그대로였는데, 베로로 성분 분석기로 보니까 이전에 먹이던 사료에 합성보존료가 듬뿍 들어있는 걸 발견했네요... 민트급 생육 원료 사료로 바꾸고 한 달 만에 눈물 흐름이 눈에 띄게 줄었어요! 역시 원재료를 꼭 분석해보고 골라야 하나봐요.',
    tags: ['말티즈', '눈물사료', '내돈내산', '베로로성분분석'],
    likes: 42,
    commentsCount: 12,
    time: '20분 전',
    hasLiked: false,
  },
  {
    id: '2',
    author: {
      name: '이수연 수의사',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120',
      badge: '베로로 파트너 수의사',
      isVet: true,
      petType: 'cat',
    },
    category: '수의사 Q&A',
    title: '고양이 건식 사료 고를 때 탄수화물 비율(NFE)이 왜 중요한가요?',
    content: '보호자분들이 가장 많이 놓치시는 부분이 바로 DM(건물기준) 탄수화물 비율입니다. 고양이는 육식동물로 탄수화물 대사 능력이 강아지나 사람에 비해 크게 제한적입니다. 건식 사료의 형태를 유지하기 위해 어쩔 수 없이 곡물이나 전분이 사용되는데, NFE 비율이 35%가 넘어가면 비만과 당뇨의 주요 원인이 됩니다. 사료 성분 등록증상 조회분과 수분을 뺀 실제 탄수화물 양을 꼭 확인하세요.',
    tags: ['수의사칼럼', '고양이건강', '건물기준', 'NFE탄수화물'],
    likes: 128,
    commentsCount: 34,
    time: '1시간 전',
    hasLiked: true,
  },
  {
    id: '3',
    author: {
      name: '미유집사',
      avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=120',
      badge: '냥덕후',
      petType: 'cat',
    },
    category: '집사꿀팁',
    title: '사료 성분표에 적힌 "가금류 분말(Poultry meal)"의 진실',
    content: '닭고기 분말(Chicken meal)이나 칠면조 분말과 다르게 가금류 분말(Poultry meal)은 어떤 새가 들어갔는지 알 수 없습니다. 오리인지, 닭인지, 칠면조인지 불분명하면 알레르기가 있는 아이들에게 매우 위험해요! 알레르기 유발원이 불분명하게 적힌 사료는 가급적 피하시고 꼭 "닭고기", "연어" 등 구체적인 원료명이 첫 번째 성분으로 명시된 사료를 추천드립니다.',
    tags: ['사료공부', '성분읽기', '가수분해', '알레르기피하기'],
    likes: 87,
    commentsCount: 23,
    time: '3시간 전',
    hasLiked: false,
  },
];

const CATEGORIES = ['전체', '사료추천', '집사꿀팁', '수의사 Q&A', '잡담'];

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  '수의사 Q&A': { bg: 'rgba(49,130,246,0.10)', color: '#1D4ED8' },
  '사료추천':   { bg: 'var(--brand-tint)',      color: 'var(--brand-deep)' },
  '집사꿀팁':   { bg: '#F0FDE8',               color: '#3A7D1C' },
  '잡담':       { bg: 'var(--fill)',             color: 'var(--ink-soft)' },
};

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
        <Pencil size={17} strokeWidth={2.4} /> {COMMUNITY_WRITE.submit}
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
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>{COMMUNITY_WRITE.screenTitle}</span>
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
            placeholder={COMMUNITY_WRITE.titlePlaceholder}
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
            placeholder={COMMUNITY_WRITE.bodyPlaceholder}
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
              {COMMUNITY_WRITE.submit}
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>
            이 카테고리에는 아직 글이 없어요.<br />{COMMUNITY_WRITE.notice}
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
