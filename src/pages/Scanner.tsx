import { Helmet } from 'react-helmet-async';
import ScannerScreen from '../components/ScannerScreen';

export default function Scanner() {
  return (
    <div style={{ padding: '8px 4px' }}>
      <Helmet>
        <title>AI 성분 스캐너 | 베로로</title>
      </Helmet>
      <ScannerScreen />
    </div>
  );
}
