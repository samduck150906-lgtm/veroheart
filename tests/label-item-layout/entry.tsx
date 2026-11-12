import {createRoot} from 'react-dom/client';
import ProductLabelReview from '../../src/pages/admin/ProductLabelReview';
import '../../src/pages/admin/ProductLabelItemMatching.css';
globalThis.fetch=async()=>{throw Error('No external transport in fixture');};
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:960,margin:'auto',padding:16,fontFamily:'sans-serif'}}><h1>합성 관리자 라벨 검토</h1><ProductLabelReview productId="synthetic-product"/></main>);
