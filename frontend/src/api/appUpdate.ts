import { isTauri } from "../utils/platform";
import {
  selectAppUpdate,
  type AppUpdate,
  type ReleaseAsset,
} from "../utils/appUpdate";

function readRelease(body: string): {
  tag_name: string;
  assets: ReleaseAsset[];
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as { tag_name?: unknown; assets?: unknown };
  if (typeof record.tag_name !== "string" || !Array.isArray(record.assets)) {
    return null;
  }
  const assets: ReleaseAsset[] = [];
  for (const asset of record.assets) {
    if (!asset || typeof asset !== "object") continue;
    const item = asset as { name?: unknown; browser_download_url?: unknown };
    if (
      typeof item.name === "string" &&
      typeof item.browser_download_url === "string"
    ) {
      assets.push({
        name: item.name,
        browser_download_url: item.browser_download_url,
      });
    }
  }
  return { tag_name: record.tag_name, assets };
}

/**
 * Ищет опубликованный релиз GitHub новее установленной версии.
 */
export async function findAppUpdate(
  currentVersion: string,
): Promise<AppUpdate | null> {
  if (!isTauri()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  const [body, arch] = await Promise.all([
    invoke<string>("fetch_latest_github_release"),
    invoke<string>("android_device_arch"),
  ]);
  return selectAppUpdate(readRelease(body) ?? {}, currentVersion, arch);
}

/**
 * Скачивает APK релиза и открывает системный установщик Android.
 */
export async function installAppUpdate(url: string): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  const status = await invoke<string>("install_github_release_apk", { url });
  if (status === "invalid_url") {
    throw new Error("invalid update url");
  }
  if (status.startsWith("error:")) {
    throw new Error(status.slice("error:".length) || "update failed");
  }
  return status;
}
