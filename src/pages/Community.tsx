import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Heart, Share2, Award, Sparkles, Filter, Plus, CheckCircle2, ThumbsUp, Send } from 'lucide-react';
import { Text } from '../components/Text';
import { Button } from '../components/Button';

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

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('집사꿀팁');
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const categories = ['전체', '사료추천', '집사꿀팁', '수의사 Q&A', '잡담'];

  const handleLike = (id: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            likes: p.hasLiked ? p.likes - 1 : p.likes + 1,
            hasLiked: !p.hasLiked,
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      author: {
        name: '행복한 집사',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        badge: '뉴비집사',
        petType: 'dog',
      },
      category: newPostCategory,
      title: newPostTitle,
      content: newPostContent,
      tags: ['베로로커뮤니티', '실시간정보'],
      likes: 1,
      commentsCount: 0,
      time: '방금 전',
      hasLiked: true,
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setIsWriteOpen(false);
  };

  const filteredPosts = selectedCategory === '전체'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  return (
    <div style={{ padding: '8px 4px' }}>
      <Helmet>
        <title>집사 소통 커뮤니티 | 베로로</title>
      </Helmet>

      {/* Header Banner */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', 
          borderRadius: '24px', 
          padding: '24px 20px', 
          color: '#FFFFFF',
          marginBottom: '24px',
          boxShadow: '0 8px 30px rgba(79, 70, 229, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Dynamic micro-pattern circles */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '10%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.06)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={16} color="#FAAC1B" className="animate-pulse" />
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.9)' }}>
            Pet Food Community
          </span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
          베로로 건강 소통 광장
        </h2>
        <Text variant="caption" style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.45 }}>
          영양 정보 공부부터 까다로운 입맛 해결법까지,<br />전문 수의사 및 꼼꼼한 보호자들과 함께 나누어 보세요.
        </Text>
      </div>

      {/* Write Post Trigger Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>카테고리 필터</span>
        </div>
        <button
          onClick={() => setIsWriteOpen(!isWriteOpen)}
          style={{
            background: 'var(--primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(129, 201, 149, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={14} strokeWidth={3} />
          글쓰기
        </button>
      </div>

      {/* Category Horizontal scroll */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '16px',
          WebkitOverflowScrolling: 'touch',
        }}
        className="no-scrollbar"
      >
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: selectedCategory === cat ? 'none' : '1px solid rgba(0, 0, 0, 0.08)',
              background: selectedCategory === cat ? 'var(--primary-dark)' : '#F8FAFC',
              color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Write Post Modal/Form Overlay */}
      {isWriteOpen && (
        <form 
          onSubmit={handleCreatePost}
          style={{ 
            background: '#FFFFFF', 
            border: '1px solid rgba(129, 201, 149, 0.25)', 
            borderRadius: '20px', 
            padding: '16px', 
            marginBottom: '20px',
            boxShadow: '0 10px 24px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>✍️ 건강 광장에 글 쓰기</span>
            <select
              value={newPostCategory}
              onChange={e => setNewPostCategory(e.target.value)}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.08)',
                background: '#F8FAFC',
                color: 'var(--text-muted)',
              }}
            >
              <option value="사료추천">사료추천</option>
              <option value="집사꿀팁">집사꿀팁</option>
              <option value="잡담">잡담</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="제목을 입력해주세요..."
            value={newPostTitle}
            onChange={e => setNewPostTitle(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '8px',
              outline: 'none',
            }}
          />

          <textarea
            placeholder="성분 분석 경험담이나 사료에 관련된 고민을 적어주세요. 욕설이나 광고성 글은 제재될 수 있습니다."
            value={newPostContent}
            onChange={e => setNewPostContent(e.target.value)}
            required
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '12px',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.45,
            }}
          />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsWriteOpen(false)}
              title="취소"
            />
            <Button
              type="submit"
              variant="primary"
              title="등록하기"
            />
          </div>
        </form>
      )}

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)', fontSize: '12px', fontWeight: 600 }}>
            이 카테고리에는 등록된 글이 아직 없습니다. 첫 글의 주인공이 되어보세요!
          </div>
        ) : (
          filteredPosts.map(post => (
            <article 
              key={post.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                padding: '18px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
              }}
            >
              {/* Author Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: post.author.isVet ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.08)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>
                        {post.author.name}
                      </span>
                      {post.author.isVet && (
                        <CheckCircle2 size={13} fill="var(--primary)" color="#FFFFFF" />
                      )}
                      <span 
                        style={{ 
                          fontSize: '8px', 
                          fontWeight: 700, 
                          padding: '1px 4px', 
                          borderRadius: '4px',
                          background: post.author.petType === 'cat' ? '#EFF6FF' : '#FEF3C7',
                          color: post.author.petType === 'cat' ? '#1D4ED8' : '#D97706',
                        }}
                      >
                        {post.author.petType === 'cat' ? '묘주' : '견주'}
                      </span>
                    </div>
                    {post.author.badge && (
                      <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--primary-dark)' }}>
                        {post.author.badge}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 500 }}>
                  {post.time}
                </span>
              </div>

              {/* Tag/Category Badge */}
              <span 
                style={{ 
                  display: 'inline-block',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: post.category === '수의사 Q&A' ? 'rgba(79, 70, 229, 0.08)' : 'var(--primary-light)',
                  color: post.category === '수의사 Q&A' ? '#4F46E5' : 'var(--primary-dark)',
                  marginBottom: '10px',
                }}
              >
                {post.category}
              </span>

              {/* Title & Content */}
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px', lineHeight: 1.4 }}>
                {post.title}
              </h3>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px', whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {post.tags.map(tag => (
                  <span 
                    key={tag} 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: 600, 
                      color: 'var(--text-light)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.04)', marginBottom: '12px' }} />

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: post.hasLiked ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <ThumbsUp size={14} fill={post.hasLiked ? 'var(--accent)' : 'none'} strokeWidth={2.25} />
                  <span>{post.likes}</span>
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  <MessageSquare size={14} strokeWidth={2.25} />
                  <span>{post.commentsCount}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
