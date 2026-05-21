// @ts-nocheck
import { Helmet } from 'react-helmet-async';
import PetProfileForm from '../components/PetProfileForm';
import { useNavigate } from 'react-router-dom';

export default function PetProfilePage() {
  const navigate = useNavigate();
  return (
    <div className="pet-profile-page">
      <Helmet>
        <title>반려동물 프로필 등록 | 베로로</title>
        <meta name="description" content="반려동물의 정보를 등록하고 맞춤 사료 분석을 받아보세요." />
      </Helmet>
      <PetProfileForm onComplete={() => navigate('/profile')} />
    </div>
  );
}
