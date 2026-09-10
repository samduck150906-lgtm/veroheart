import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminNotFound() {
  return (
    <div className="admin-card admin-not-found">
      <span className="admin-not-found-code">404</span>
      <h2>페이지를 찾을 수 없습니다.</h2>
      <p>주소가 변경됐거나 관리자 메뉴에서 제공하지 않는 페이지입니다.</p>
      <Link className="admin-btn-primary" to="/admin"><ArrowLeft size={15} /> 대시보드로 이동</Link>
    </div>
  );
}
