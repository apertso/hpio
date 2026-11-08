import { describe, expect, it } from "vitest";
import {
  isNewerVersion,
  pickApkAsset,
  releaseVersion,
  selectAppUpdate,
  type ReleaseAsset,
} from "../appUpdate";

const arm64: ReleaseAsset = {
  name: "app-arm64-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.1.0/app-arm64-release.apk",
};
const universal: ReleaseAsset = {
  name: "app-universal-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.1.0/app-universal-release.apk",
};

describe("app update selection", () => {
  it("reads a semver tag and ignores everything else", () => {
    expect(releaseVersion("v1.2.3")).toBe("1.2.3");
    expect(releaseVersion("1.2.3")).toBe("1.2.3");
    expect(releaseVersion("nightly")).toBeNull();
  });

  it("treats only a higher major, minor, or patch as an update", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
  });

  it("picks the arm64 apk on aarch64 and the universal apk otherwise", () => {
    expect(pickApkAsset([universal, arm64], "aarch64")?.name).toBe(
      "app-arm64-release.apk",
    );
    expect(pickApkAsset([arm64, universal], "armeabi-v7a")?.name).toBe(
      "app-universal-release.apk",
    );
    expect(pickApkAsset([universal], "aarch64")?.name).toBe(
      "app-universal-release.apk",
    );
    expect(pickApkAsset([arm64], "armeabi-v7a")).toBeNull();
  });

  it("offers an update only when the release is newer and has an apk", () => {
    expect(
      selectAppUpdate(
        { tag_name: "v1.1.0", assets: [arm64, universal] },
        "1.0.0",
        "aarch64",
      ),
    ).toEqual({ version: "1.1.0", url: arm64.browser_download_url });
    expect(
      selectAppUpdate(
        { tag_name: "v1.0.0", assets: [arm64] },
        "1.0.0",
        "aarch64",
      ),
    ).toBeNull();
    expect(
      selectAppUpdate({ tag_name: "v1.1.0", assets: [] }, "1.0.0", "aarch64"),
    ).toBeNull();
  });
});
