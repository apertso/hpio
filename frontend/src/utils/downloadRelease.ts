import {
  ARM64_APK_NAME,
  ARMV7_APK_NAME,
  isNewerVersion,
  releaseVersion,
  type ReleaseAsset,
} from "./appUpdate";

const RELEASES_URL =
  "https://api.github.com/repos/apertso/hpio/releases?per_page=10";

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

/** Берёт самый новый стабильный релиз с APK для ARM64 и ARMv7. */
export function selectReadyRelease(body: unknown): DownloadBuild | null {
  let best: DownloadBuild | null = null;
  for (const release of readReleases(body)) {
    if (release.draft || release.prerelease) continue;
    const version = releaseVersion(release.tag_name);
    if (!version) continue;
    const arm64 = release.assets.find((asset) => asset.name === ARM64_APK_NAME);
    const armv7 = release.assets.find((asset) => asset.name === ARMV7_APK_NAME);
    if (!arm64?.browser_download_url || !armv7?.browser_download_url) continue;
    if (!best || isNewerVersion(version, best.version)) {
      best = {
        version,
        files: {
          [ARM64_APK_NAME]: arm64.browser_download_url,
          [ARMV7_APK_NAME]: armv7.browser_download_url,
        },
      };
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
