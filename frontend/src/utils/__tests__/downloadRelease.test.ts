import { describe, expect, it } from "vitest";
import { selectReadyRelease } from "../downloadRelease";

const arm64 = {
  name: "app-arm64-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.2.0/app-arm64-release.apk",
};
const universal = {
  name: "app-universal-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.1.0/app-universal-release.apk",
};
const armv7 = {
  name: "app-armv7-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.2.0/app-armv7-release.apk",
};

describe("download release selection", () => {
  it("skips a newer release until both APKs are attached", () => {
    expect(
      selectReadyRelease([
        { tag_name: "v1.3.0", assets: [arm64] },
        { tag_name: "v1.2.0", assets: [arm64, armv7] },
      ]),
    ).toEqual({
      version: "1.2.0",
      files: {
        "app-arm64-release.apk": arm64.browser_download_url,
        "app-armv7-release.apk": armv7.browser_download_url,
      },
    });
  });

  it("ignores drafts, prereleases, and tags without a stable version", () => {
    expect(
      selectReadyRelease([
        { tag_name: "v1.4.0", draft: true, assets: [arm64, armv7] },
        { tag_name: "v1.3.0", prerelease: true, assets: [arm64, armv7] },
        { tag_name: "nightly", assets: [arm64, armv7] },
        { tag_name: "v1.2.0", assets: [arm64, armv7] },
      ])?.version,
    ).toBe("1.2.0");
  });

  it("waits for ARMv7 when only the older release is available", () => {
    expect(
      selectReadyRelease([
        { tag_name: "v1.2.0", assets: [arm64] },
        { tag_name: "v1.1.0", assets: [arm64, universal] },
      ]),
    ).toBeNull();
  });
});
