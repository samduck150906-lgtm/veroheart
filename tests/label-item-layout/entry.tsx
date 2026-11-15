import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import ProductLabelReview from '../../src/pages/admin/ProductLabelReview';
import '../../src/pages/admin/ProductLabelItemMatching.css';
globalThis.fetch=async()=>{throw Error('No external transport in fixture');};
export default function App(){const [id,setId]=useState('synthetic-product');return <main style={{maxWidth:960,margin:'auto',padding:16,fontFamily:'sans-serif'}}><h1>합성 관리자 라벨 검토</h1><button onClick={()=>setId('synthetic-second')}>합성 다른 제품으로 이동</button><ProductLabelReview productId={id}/></main>;}
createRoot(document.getElementById('root')!).render(<App/>);
