// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ThumbsUp, MessageSquare, Trash2, Send, Loader2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  getCommunityPost,
  getCommunityComments,
  createCommunityComment,
  deleteCommunityComment,
  toggleCommunityPostLike,
  deleteCommunityPost,
  type CommunityPostRow,
  type CommunityCommentRow,
} from '../lib/supabase';

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

export default function CommunityPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { userId, isLoggedIn } = useStore();

  const [post, setPost] = useState<CommunityPostRow | null>(null);
  const [comments, setComments] = useState<CommunityCommentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      setIsLoading(true);
      const [p, c] = await Promise.all([
        getCommunityPost(postId, userId ?? undefined),
        getCommunityComments(postId),
      ]);
      setPost(p);
      setComments(c);
      setIsLoading(false);
    })();
  }, [postId, userId]);

  const handleLike = async () => {
    if (!isLoggedIn || !userId) { navigate('/login'); return; }
    if (!post) return;
    const hasLiked = post.has_liked ?? false;
    const nextLiked = !hasLiked;
    setPost(p => p ? { ...p, has_liked: nextLiked, likes_count: p.likes_count + (nextLiked ? 1 : -1) } : p);
    const confirmed = await toggleCommunityPostLike(userId, post.id, hasLiked);
    if (confirmed !== nextLiked) {
      setPost(p => p ? { ...p, has_liked: confirmed, likes_count: p.likes_count + (confirmed ? 1 : -1) } : p);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !userId) return;
    if (!window.confirm('이 글을 삭제할까요?')) return;
    const ok = await deleteCommunityPost(userId, post.id);
    if (ok) navigate('/community', { replace: true });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !userId) { navigate('/login'); return; }
    const text = commentText.trim();
    if (!text || !postId) return;
    setIsSubmitting(true);
    const comment = await createCommunityComment(userId, postId, text);
    if (comment) {
      setComments(prev => [...prev, comment]);
      setCommentText('');
      setPost(p => p ? { ...p, comments_count: p.comments_count + 1 } : p);
    }
    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!userId) return;
    const ok = await deleteCommunityComment(userId, commentId);
    if (ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(p => p ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={28} style={{ animation: 'spin 0.85s linear infinite', color: 'var(--brand-deep)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <p style={{ color: 'var(--ink-faint)', fontSize: '14px' }}>글을 찾을 수 없어요.</p>
        <button onClick={() => navigate('/community')} style={{ marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-deep)', fontWeight: 700, fontSize: '14px' }}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const cs = CATEGORY_STYLE[post.category] ?? { bg: 'var(--fill)', color: 'var(--ink-soft)' };
  const isOwnPost = userId === post.user_id;

  return (
    <div style={{ paddingBottom: '120px' }}>
      <Helmet>
        <title>{post.title} — 랜선애카 베로로</title>
      </Helmet>

      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0 18px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--ink-soft)', fontWeight: 700, fontSize: '14px', padding: 0 }}
        >
          <ArrowLeft size={18} /> 목록
        </button>
      </div>

      {/* Post body */}
      <article style={{ background: '#fff', borderRadius: '20px', border: '1px solid var(--hairline)', padding: '22px 20px', marginBottom: '16px' }}>
        {/* Category + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '7px',
            background: cs.bg, color: cs.color,
          }}>
            {post.category}
          </span>
          {isOwnPost && (
            <button
              onClick={handleDeletePost}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              <Trash2 size={13} /> 삭제
            </button>
          )}
        </div>

        {/* Title */}
        <h1 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 900, color: 'var(--ink)', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
          {post.title}
        </h1>

        {/* Author + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🐾</div>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-soft)' }}>{post.users?.nickname || '익명 집사'}</span>
          <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>·</span>
          <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>{timeAgo(post.created_at)}</span>
        </div>

        {/* Content */}
        <p style={{ margin: '0 0 18px', fontSize: '14.5px', lineHeight: 1.75, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
          {post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)' }}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--hairline)', marginBottom: '14px' }} />

        {/* Like + comment count */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={handleLike}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: post.has_liked ? '#FFF1F2' : 'var(--fill)',
              border: `1px solid ${post.has_liked ? '#FECACA' : 'var(--hairline)'}`,
              borderRadius: '99px', padding: '8px 16px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700,
              color: post.has_liked ? '#E04452' : 'var(--ink-soft)',
              transition: 'all 0.15s',
            }}
          >
            <ThumbsUp size={15} fill={post.has_liked ? '#E04452' : 'none'} strokeWidth={2.2} />
            좋아요 {post.likes_count}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--ink-faint)' }}>
            <MessageSquare size={15} strokeWidth={2.2} />
            댓글 {post.comments_count}
          </div>
        </div>
      </article>

      {/* Comments section */}
      <section>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px', padding: '0 4px' }}>
          댓글 {comments.length}개
        </div>

        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>
            첫 번째 댓글을 남겨보세요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {comments.map(comment => {
              const isOwn = userId === comment.user_id;
              return (
                <div key={comment.id} style={{
                  background: '#fff', borderRadius: '16px',
                  border: '1px solid var(--hairline)', padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>🐾</div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>
                        {comment.users?.nickname || '익명 집사'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>{timeAgo(comment.created_at)}</span>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Comment input — fixed at bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid var(--hairline)',
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        zIndex: 100,
      }}>
        <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={isLoggedIn ? '댓글을 입력해주세요' : '로그인 후 댓글을 작성할 수 있어요'}
            disabled={!isLoggedIn}
            rows={1}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 100) + 'px';
            }}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: '14px',
              border: '1.5px solid var(--hairline)', background: 'var(--fill)',
              fontSize: '14px', color: 'var(--ink)', outline: 'none',
              resize: 'none', lineHeight: 1.5, fontFamily: 'inherit',
              minHeight: '44px', maxHeight: '100px',
            }}
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            style={{
              width: '44px', height: '44px', borderRadius: '13px', flexShrink: 0,
              background: commentText.trim() ? 'var(--brand)' : 'var(--fill)',
              border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            {isSubmitting
              ? <Loader2 size={18} style={{ animation: 'spin 0.85s linear infinite' }} />
              : <Send size={17} color={commentText.trim() ? 'var(--ink-on-brand)' : 'var(--ink-faint)'} />}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
