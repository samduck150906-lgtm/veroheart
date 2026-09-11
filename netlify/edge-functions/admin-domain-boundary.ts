const ADMIN_HOSTNAME = 'veroro-admin.netlify.app';

/** 같은 빌드를 쓰는 두 Netlify 사이트 중 관리자 호스트의 루트만 관리자 홈으로 보낸다. */
export default function adminDomainBoundary(request: Request) {
  const url = new URL(request.url);
  if (url.hostname.toLowerCase() !== ADMIN_HOSTNAME || url.pathname !== '/') return;

  url.pathname = '/admin';
  return Response.redirect(url, 302);
}

export const config = {
  path: '/',
};
