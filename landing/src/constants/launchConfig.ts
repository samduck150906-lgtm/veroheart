/**
 * 출시 상태 단일 소스.
 * 이 값만 바꾸면 CTA·배지·스토어 링크 노출 여부가 페이지 전체에 반영된다.
 */

export type LaunchStatus = "prelaunch" | "beta" | "launched";

type LaunchConfig = {
  status: LaunchStatus;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  betaApplicationUrl: string | null;
};

export const launchConfig: LaunchConfig = {
  status: "prelaunch",
  appStoreUrl: null,
  playStoreUrl: null,
  betaApplicationUrl: null,
};

export const isPrelaunch = launchConfig.status === "prelaunch";
export const isBeta = launchConfig.status === "beta";
export const isLaunched = launchConfig.status === "launched";
