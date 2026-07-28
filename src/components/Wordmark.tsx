/**
 * VERORO 워드마크 — 브랜드 원본 PNG(`public/veroro-wordmark.png`, 1536×1024)에서
 * 글자 영역만 잘라 쓴다. 크롭 좌표는 디자인 핸드오프
 * (`VERORO App.dc.html`의 img 오프셋)에서 그대로 역산한 값이다.
 *   x 322/1536, y 399.5/1024, w 768/1536, h 162/1024
 * 워드마크는 노란색 글자라 항상 잉크(#15150F) 칩 위에 얹는다.
 */

const CROP_X = 322 / 1536;
const CROP_Y = 399.5 / 1024;
const CROP_W = 768 / 1536;
const CROP_H = 162 / 1024;

/** 잘라낸 워드마크의 가로:세로 비 (≈4.74) */
export const WORDMARK_RATIO = (CROP_W * 1536) / (CROP_H * 1024);

export const VERORO_WORDMARK_SRC = '/veroro-wordmark.png';

interface WordmarkProps {
  /** 워드마크 높이(px). 프로토타입 기준: 헤더 15, 로그인 20, 게이트 18, 스플래시 44 */
  height?: number;
}

export default function Wordmark({ height = 15 }: WordmarkProps) {
  const width = height * WORDMARK_RATIO;
  const imgWidth = width / CROP_W;
  const imgHeight = height / CROP_H;

  return (
    <span
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
        flex: 'none',
      }}
    >
      <img
        src={VERORO_WORDMARK_SRC}
        alt="VERORO"
        style={{
          position: 'absolute',
          left: `${-CROP_X * imgWidth}px`,
          top: `${-CROP_Y * imgHeight}px`,
          width: `${imgWidth}px`,
          height: `${imgHeight}px`,
          maxWidth: 'none',
        }}
      />
    </span>
  );
}

interface LogoChipProps extends WordmarkProps {
  /** 칩 자체를 버튼으로 쓸 때의 클릭 핸들러 */
  onClick?: () => void;
  /** 칩 좌우/상하 패딩 — 프로토타입 기본은 7px 10px */
  padding?: string;
  radius?: number;
  ariaLabel?: string;
}

/** 잉크 배경 라운드 칩에 얹은 워드마크 — 헤더·게이트·로그인에서 쓰는 형태 */
export function LogoChip({
  height = 15,
  onClick,
  padding = '7px 10px',
  radius = 7,
  ariaLabel = 'VERORO 홈',
}: LogoChipProps) {
  if (onClick) {
    return (
      <button
        type="button"
        className="vr-logo-chip"
        style={{ padding, borderRadius: `${radius}px` }}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <Wordmark height={height} />
      </button>
    );
  }
  return (
    <span className="vr-logo-chip" style={{ padding, borderRadius: `${radius}px` }}>
      <Wordmark height={height} />
    </span>
  );
}
