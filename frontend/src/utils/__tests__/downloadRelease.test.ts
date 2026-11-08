import { describe, expect, it } from "vitest";
import { selectReadyRelease } from "../downloadRelease";

const arm64 = {
  name: "app-arm64-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.1.0/app-arm64-release.apk",
};
const universal = {
  name: "app-universal-release.apk",
  browser_download_url:
    "https://github.com/apertso/hpio/releases/download/v1.1.0/app-universal-release.apk",
};

describe("download release selection", () => {
  it("skips a newer release until both APKs are attached", () => {
    expect(
      selectReadyRelease([
        { tag_name: "v1.2.0", assets: [] },
        { tag_name: "v1.1.0", assets: [arm64, universal] },
      ]),
    ).toEqual({
      version: "1.1.0",
      files: {
        "app-arm64-release.apk": arm64.browser_download_url,
        "app-universal-release.apk": universal.browser_download_url,
      },
    });
  });

  it("ignores a release that has only one APK and drafts", () => {
    expect(
      selectReadyRelease([
        { tag_name: "v1.3.0", draft: true, assets: [arm64, universal] },
        { tag_name: "v1.2.0", prerelease: true, assets: [arm64, universal] },
        { tag_name: "v1.1.1", assets: [arm64] },
        { tag_name: "nightly", assets: [arm64, universal] },
        { tag_name: "v1.1.0", assets: [universal, arm64] },
      ])?.version,
    ).toBe("1.1.0");
  });
});
