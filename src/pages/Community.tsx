// @ts-nocheck
import { useState } from 'react';
import { Plus, ThumbsUp, MessageCircle } from 'lucide-react';
import { MOCK_COMMUNITY_POSTS } from '../data/mvpMock';

const CATS = ['전체', '정보공유', '수의사칼럼', '성분분석', '질문'];

const catColors = {
  '정보공유': { bg: '#E7F8F0', color: '#15B36B' },
  '수의사칼럼': { bg: '#EEF2FF', color: '#6366F1' },
  '성분분석': { bg: '#FEF6E0', color: '#E8A800' },
  '질문': { bg: '#F0EDE8', color: '#6B7684' },
};

export default function Community() {
  const [activeTab, setActiveTab] = useState('전체');
  const [likes, setLikes] = useState({});

  const filtered = activeTab === '전체' ? MOCK_COMMUNITY_POSTS : MOCK_COMMUNITY_POSTS.filter(p => p.category === activeTab);

  const toggleLike = (id) => {
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ paddingBottom: 90, position: 'relative' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>커뮤니티</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 14 }}>반려동물 식단 정보를 함께 나눠요</p>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setActiveTab(cat)}
              style={{
                flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeTab === cat ? '#191F28' : '#fff',
                color: activeTab === cat ? '#fff' : '#6B7684',
                boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(post => {
            const cc = catColors[post.category] || { bg: '#F0EDE8', color: '#6B7684' };
            const isLiked = likes[post.id] ?? post.isLiked;
            return (
              <div key={post.id}
                style={{ background: '#fff', borderRadius: 18, padding: '18px', boxShadow: '0 2px 10px rgba(30,41,59,0.06)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ background: cc.bg, color: cc.color, fontSize: 11, fontWeight: 800, borderRadius: 8, padding: '3px 8px' }}>{post.category}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 6, lineHeight: 1.4 }}>{post.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7684', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4E5968' }}>{post.author}</span>
                    {post.authorBadge && (
                      <span style={{ background: '#E7F8F0', color: '#15B36B', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 6px' }}>{post.authorBadge}</span>
                    )}
                    <span style={{ fontSize: 12, color: '#B0B8C1' }}>· {post.time}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button onClick={() => toggleLike(post.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                      <ThumbsUp size={14} fill={isLiked ? '#4E5968' : 'none'} color={isLiked ? '#191F28' : '#B0B8C1'} />
                      <span style={{ fontSize: 12, color: isLiked ? '#191F28' : '#B0B8C1', fontWeight: 700 }}>
                        {post.likes + (isLiked !== post.isLiked ? (isLiked ? 1 : -1) : 0)}
                      </span>
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageCircle size={14} color="#B0B8C1" />
                      <span style={{ fontSize: 12, color: '#B0B8C1', fontWeight: 700 }}>{post.comments}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => alert('새 글 작성')}
        style={{
          position: 'fixed', bottom: 90, right: '50%', transform: 'translateX(calc(50% - 200px + 16px + 200px))',
          width: 54, height: 54, borderRadius: '50%',
          background: '#F5C518', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(245,197,24,0.4)',
          zIndex: 40,
        }}
      >
        <Plus size={24} color="#191F28" strokeWidth={2.5} />
      </button>
    </div>
  );
}
