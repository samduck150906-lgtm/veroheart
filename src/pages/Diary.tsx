import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedingDiary from '../components/diary/FeedingDiary';
import StateView from '../components/StateView';
import { useStore } from '../store/useStore';

export default function Diary() {
  const { userId } = useStore();
  const navigate = useNavigate();

  if (!userId) return <StateView
    icon={<BookOpen size={30} />}
    title="로그인하고 식이 기록을 시작해 보세요."
    description="반려동물별로 먹은 음식과 반응을 기록할 수 있어요."
    action={{ label: '로그인 / 회원가입', onClick: () => navigate('/login', { state: { from: '/diary' } }) }}
    minHeight={360}
  />;

  return <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
    <FeedingDiary key={userId} onRegisterPet={() => navigate('/profile?tab=pets')} />
  </div>;
}
