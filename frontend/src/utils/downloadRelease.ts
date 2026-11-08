import { isNewerVersion, releaseVersion, type ReleaseAsset } from "./appUpdate";

export const ARM64_APK_NAME = "app-arm64-release.apk";
export const UNIVERSAL_APK_NAME = "app-universal-release.apk";

const RELEASES_URL =
  "https://api.github.com/repos/apertso/hpio/releases?per_page=10";
const APK_NAMES = [ARM64_APK_NAME, UNIVERSAL_APK_NAME];

export interface DownloadBuild {
  version: string;
  files: Record<string, string>;
}

interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

function readAsset(value: unknown): ReleaseAsset | null {
  if (!value || typeof value !== "object") return null;
  const asset = value as { name?: unknown; browser_download_url?: unknown };
  if (
    typeof asset.name !== "string" ||
    typeof asset.browser_download_url !== "string"
  ) {
    return null;
  }
  return { name: asset.name, browser_download_url: asset.browser_download_url };
}

function readReleases(body: unknown): GithubRelease[] {
  if (!Array.isArray(body)) return [];
  const releases: GithubRelease[] = [];
  for (const item of body) {
    if (!item || typeof item !== "object") continue;
    const release = item as {
      tag_name?: unknown;
      draft?: unknown;
      prerelease?: unknown;
      assets?: unknown;
    };
    if (typeof release.tag_name !== "string") continue;
    const assets = Array.isArray(release.assets)
      ? release.assets.flatMap((asset) => {
          const parsed = readAsset(asset);
          return parsed ? [parsed] : [];
        })
      : [];
    releases.push({
      tag_name: release.tag_name,
      draft: release.draft === true,
      prerelease: release.prerelease === true,
      assets,
    });
  }
  return releases;
}

/**
 * Берёт самый новый стабильный релиз, у которого уже есть оба APK.
 * Свежий тег без файлов пропускается: сборка появляется примерно через 10 минут после публикации.
 */
export function selectReadyRelease(body: unknown): DownloadBuild | null {
  let best: DownloadBuild | null = null;
  for (const release of readReleases(body)) {
    if (release.draft || release.prerelease) continue;
    const version = releaseVersion(release.tag_name);
    if (!version) continue;
    const files: Record<string, string> = {};
    let complete = true;
    for (const name of APK_NAMES) {
      const url = release.assets.find((asset) => asset.name === name)
        ?.browser_download_url;
      if (!url) {
        complete = false;
        break;
      }
      files[name] = url;
    }
    if (!complete) continue;
    if (!best || isNewerVersion(version, best.version)) {
      best = { version, files };
    }
  }
  return best;
}

/** Запрашивает релизы GitHub и возвращает последнюю готовую сборку. */
export async function fetchReadyRelease(): Promise<DownloadBuild | null> {
  const response = await fetch(RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub releases request failed: ${response.status}`);
  }
  const body: unknown = await response.json();
  return selectReadyRelease(body);
}
