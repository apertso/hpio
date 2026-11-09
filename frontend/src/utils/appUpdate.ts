export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface AppUpdate {
  version: string;
  url: string;
}

export const ARM64_APK_NAME = "app-arm64-release.apk";
export const ARMV7_APK_NAME = "app-armv7-release.apk";

export function releaseVersion(tag: string): string | null {
  const match = /^v?(\d+\.\d+\.\d+)$/.exec(tag.trim());
  return match ? match[1] : null;
}

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (version: string): number[] | null => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const next = parse(latest);
  const installed = parse(current);
  if (!next || !installed) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== installed[index]) return next[index] > installed[index];
  }
  return false;
}

export function pickApkAsset(
  assets: ReleaseAsset[],
  arch: string,
): ReleaseAsset | null {
  const preferred =
    arch === "aarch64" ? ARM64_APK_NAME :
    arch === "armeabi-v7a" ? ARMV7_APK_NAME : null;
  return assets.find((asset) => asset.name === preferred) ?? null;
}

export function selectAppUpdate(
  release: { tag_name?: string; assets?: ReleaseAsset[] },
  currentVersion: string,
  arch: string,
): AppUpdate | null {
  const latest = releaseVersion(release.tag_name ?? "");
  if (!latest || !isNewerVersion(latest, currentVersion)) return null;
  const asset = pickApkAsset(release.assets ?? [], arch);
  if (!asset?.browser_download_url) return null;
  return { version: latest, url: asset.browser_download_url };
}
