/** Pointer Lock can report completion through a promise or document events. */
export function requestPointerCapture(
  canvas: HTMLCanvasElement,
): Promise<void> {
  const owner = canvas.ownerDocument;
  return new Promise((resolve, reject) => {
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    function succeed() {
      listeners.abort();
      resolve();
    }
    function fail(error: unknown) {
      listeners.abort();
      reject(error);
    }
    owner.addEventListener(
      'pointerlockchange',
      () => {
        if (owner.pointerLockElement === canvas) succeed();
      },
      options,
    );
    owner.addEventListener(
      'pointerlockerror',
      () => {
        fail(new Error('Capture refusée par le navigateur.'));
      },
      options,
    );
    try {
      const result = canvas.requestPointerLock() as Promise<void> | undefined;
      if (owner.pointerLockElement === canvas) succeed();
      else if (result) void result.then(succeed, fail);
    } catch (error) {
      fail(error);
    }
  });
}
