/** Reads Safari's product version, distinct from its WebKit build number. */
export function safariVersion(userAgent: string) {
  const version = /\bVersion\/(\d+)(?:\.(\d+))?[\d.]*.*\bSafari\//.exec(
    userAgent,
  );
  return version
    ? { major: Number(version[1]), minor: Number(version[2] ?? 0) }
    : null;
}

export function supportsFullscreenPointerLock(userAgent: string): boolean {
  const version = safariVersion(userAgent);
  // WebKit bug 272136 was fixed in Safari 18.2.
  return (
    !version ||
    version.major > 18 ||
    (version.major === 18 && version.minor >= 2)
  );
}
