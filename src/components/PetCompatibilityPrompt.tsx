import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function PetCompatibilityPrompt({ compact = false }: { compact?: boolean }) {
  const { isLoggedIn } = useStore();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => isLoggedIn
        ? navigate('/profile?tab=pets&add=1')
        : navigate('/login?next=%2Fprofile%3Ftab%3Dpets%26add%3D1', { state: { from: '/profile?tab=pets&add=1' } })}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'var(--vr-soft)', color: 'var(--vr-ink)',
        border: '1px solid var(--line)', borderRadius: compact ? 10 : 18,
        padding: compact ? '10px 12px' : '20px',
        fontSize: compact ? 12 : 16, fontWeight: 800, lineHeight: 1.6,
        wordBreak: 'keep-all',
      }}
    >
      {isLoggedIn ? '우리 아이를 등록하고 궁합을 확인해 주세요.' : '로그인하고 우리 아이 등록하기'}
    </button>
  );
}
