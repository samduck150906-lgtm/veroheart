import Link from "next/link";
import { Reveal } from "@/components/Reveal";

const APP_STORE = "https://apps.apple.com/kr/search?term=%EB%B2%A0%EB%A1%9C%EB%A1%9C";
const PLAY_STORE = "https://play.google.com/store/search?q=%EB%B2%A0%EB%A1%9C%EB%A1%9C&c=apps";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "veroro@eternalsix.com";
const PREORDER_MAIL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[VeRoRo] 사전 예약 신청")}`;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fffdf7] text-[#1c1917] overflow-x-hidden font-sans">
      
      {/* 1. HERO SECTION */}
      <header className="relative pt-24 pb-20 lg:pt-36 lg:pb-32 px-5 sm:px-6 bg-gradient-to-b from-[#FFF5E1] to-[#fffdf7]">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <Reveal>
            <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-extrabold tracking-tight leading-tight mb-6">
              우리 아이가 먹는 사료, <br className="hidden sm:block" />
              <span className="text-[#FDB833]">정말 안전한가요?</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#57534e] max-w-2xl mx-auto mb-10 leading-relaxed">
              15,000+개 성분을 꼼꼼하게 분석해<br />
              우리 아이에게 꼭 맞는 맞춤 사료를 찾아드려요.
            </p>
          </Reveal>

          <Reveal delayMs={100} className="w-full max-w-lg mx-auto relative mb-12">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="사료 이름이나 성분을 검색해보세요" 
                disabled
                className="w-full py-4 pl-12 pr-4 bg-white border border-gray-200 rounded-full shadow-sm text-gray-700 focus:outline-none cursor-not-allowed"
              />
              <button className="absolute right-2 top-2 bottom-2 bg-[#FDB833] hover:bg-[#e5a022] transition-colors text-white px-6 rounded-full font-bold text-sm shadow-md">
                검색
              </button>
            </div>
          </Reveal>

          <Reveal delayMs={200} className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto">
            <a href={APP_STORE} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-2xl font-bold transition-transform hover:scale-105 shadow-lg">
              <svg viewBox="0 0 384 512" className="w-6 h-6 fill-current"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              App Store
            </a>
            <a href={PLAY_STORE} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-3 bg-white text-black border border-gray-200 px-6 py-4 rounded-2xl font-bold transition-transform hover:scale-105 shadow-lg">
              <svg viewBox="0 0 512 512" className="w-6 h-6 fill-current text-[#4285F4]"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
              Google Play
            </a>
          </Reveal>
        </div>
      </header>

      {/* 2. INGREDIENT SEARCH */}
      <section className="py-20 lg:py-28 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                성분, 이제 검색해서 확인하세요
              </h2>
              <p className="text-[#57534e] text-lg">
                어려운 원재료명, 피해야 할 알러지 성분을<br className="sm:hidden" /> 한눈에 쏙 들어오게 정리했습니다.
              </p>
            </div>
          </Reveal>
          
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {['닭고기', '곡물', '인공첨가물', '연어', '고구마', '옥수수', '글루텐', '유제품', '대두'].map((tag, i) => (
              <Reveal key={tag} delayMs={i * 50}>
                <span className={`px-5 py-2.5 rounded-full font-bold text-sm shadow-sm border border-gray-100 transition-transform hover:-translate-y-1 ${
                  ['인공첨가물', '곡물'].includes(tag) ? 'bg-red-50 text-red-600 border-red-100' : 
                  ['닭고기', '연어', '고구마'].includes(tag) ? 'bg-[#FFF5E1] text-[#d97706] border-[#fde68a]' : 
                  'bg-gray-50 text-gray-700'
                }`}>
                  # {tag}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CUSTOM RECOMMENDATION */}
      <section className="py-20 lg:py-28 bg-[#fdfaf5]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                상황별 맞춤 추천
              </h2>
              <p className="text-[#57534e] text-lg">
                아이의 나이, 알러지, 건강 상태에 딱 맞는 제품만 모았어요.
              </p>
            </div>
          </Reveal>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                emoji: "🐶",
                title: "성장기 퍼피를 위한",
                desc: "뼈와 두뇌 발달에 좋은 고영양 식단",
                color: "bg-blue-50"
              },
              {
                emoji: "🚫",
                title: "알레르기 안심",
                desc: "가수분해 및 단일 단백질 사료 모음",
                color: "bg-[#FFF5E1]"
              },
              {
                emoji: "🐱",
                title: "노령묘 소화 케어",
                desc: "위장이 편안한 습식 & 그레인프리",
                color: "bg-green-50"
              }
            ].map((card, i) => (
              <Reveal key={i} delayMs={i * 100}>
                <div className={`rounded-3xl p-8 h-full transition-transform hover:-translate-y-2 shadow-sm border border-gray-100 ${card.color}`}>
                  <div className="text-4xl mb-4">{card.emoji}</div>
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                  <p className="text-[#57534e] font-medium leading-relaxed">{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRUST & CONVERSION */}
      <section className="py-20 lg:py-28 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 leading-tight">
                이미 많은 반려인들이 <br />
                <span className="text-[#FDB833]">베로로</span>를 믿고 선택했습니다.
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-gray-500 text-sm font-bold mb-1">분석된 성분</p>
                  <p className="text-3xl font-extrabold text-[#1c1917]">15,000<span className="text-[#FDB833]">+</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-gray-500 text-sm font-bold mb-1">솔직한 찐 리뷰</p>
                  <p className="text-3xl font-extrabold text-[#1c1917]">5,000<span className="text-[#FDB833]">+</span></p>
                </div>
              </div>
            </Reveal>
          </div>
          
          <div className="flex-1 w-full max-w-md">
            <Reveal delayMs={100}>
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 relative">
                <div className="absolute -top-4 -left-4 text-4xl">✨</div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=100&q=80" className="w-full h-full object-cover" alt="User" />
                  </div>
                  <div>
                    <p className="font-bold">망고 보호자</p>
                    <p className="text-xs text-gray-500">웰시코기 · 3살</p>
                  </div>
                </div>
                <p className="text-[#57534e] leading-relaxed italic">
                  &quot;매번 뒷면의 깨알 같은 글씨를 보면서도 뭐가 뭔지 몰랐는데, 베로로 앱 하나로 알레르기 유발 성분을 피할 수 있게 됐어요!&quot;
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="py-20 lg:py-28 bg-[#fdfaf5]">
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-center mb-12">자주 묻는 질문</h2>
            <div className="space-y-4">
              {[
                { q: "모든 기능이 무료인가요?", a: "네! 베로로의 기본적인 성분 검색과 리뷰 조회 기능은 모두 무료로 제공됩니다." },
                { q: "사료 정보는 어떻게 수집되나요?", a: "공식 제조사에서 제공하는 성분표 데이터와 함께 전문가의 검수를 거쳐 안전성을 판단합니다." },
                { q: "앱에서 바로 구매도 가능한가요?", a: "맞춤형 추천 후, 가장 저렴하고 빠른 쿠팡 로켓배송 등으로 연결해 편하게 구매할 수 있도록 돕고 있습니다." }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-2 flex gap-3">
                    <span className="text-[#FDB833]">Q.</span> {faq.q}
                  </h3>
                  <p className="text-[#57534e] pl-7 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-24 bg-[#FDB833] text-white text-center">
        <div className="max-w-4xl mx-auto px-5 sm:px-6">
          <Reveal>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-8 leading-tight text-black">
              지금 바로 우리 아이<br />
              맞춤 사료를 찾아보세요!
            </h2>
            <a 
              href={PREORDER_MAIL}
              className="inline-block bg-black text-white hover:bg-gray-800 transition-colors px-10 py-5 rounded-full font-bold text-lg shadow-xl"
            >
              사전 예약 신청하기
            </a>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-black tracking-tighter">VeRoRo</h3>
            <p className="text-sm text-gray-500 mt-2">반려동물 성분 분석 필수 앱</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/terms" className="hover:text-black">이용약관</Link>
            <Link href="/privacy" className="hover:text-black">개인정보처리방침</Link>
            <a href={PREORDER_MAIL} className="hover:text-black">고객센터</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 mt-8 text-center md:text-left text-xs text-gray-400">
          © {new Date().getFullYear()} VeRoRo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
