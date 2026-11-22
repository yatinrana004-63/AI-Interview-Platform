export function httpError(status, message) {
  return Object.assign(new Error(message), { status, publicMessage: message });
}

export function limitPerUser(max, intervalMs) {
  const windows = new Map();

  return (req, res, next) => {
    const now = Date.now();
    for (const [id, window] of windows) {
      if (window.expiresAt <= now) windows.delete(id);
    }

    const id = req.user.clerkId;
    const window = windows.get(id) || { count: 0, expiresAt: now + intervalMs };
    if (window.count >= max) {
      res.set("Retry-After", String(Math.ceil((window.expiresAt - now) / 1000)));
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }

    window.count += 1;
    windows.set(id, window);
    next();
  };
}
