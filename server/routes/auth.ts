import { Router, type Request, type Response } from "express";
import passport from "passport";

export const authRouter = Router();

/** Inizia il flow OAuth Google. */
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

/** Callback Google. Su successo redirect, su fallimento mostra messaggio. */
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?error=auth_failed",
    failureMessage: true,
  }),
  (req: Request, res: Response) => {
    const redirect = (req.session as any).postLoginRedirect || "/";
    delete (req.session as any).postLoginRedirect;
    res.redirect(redirect);
  },
);

/** Info utente corrente. Usato dal frontend per sapere se loggato + ruolo. */
authRouter.get("/me", (req: Request, res: Response) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return res.json({ authenticated: true, user: req.user });
  }
  return res.status(401).json({ authenticated: false });
});

/** Logout: distrugge la sessione. */
authRouter.post("/logout", (req: Request, res: Response, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("immogest.sid");
      res.json({ ok: true });
    });
  });
});

/** DEBUG: stato session/cookie/passport — rimuovere in produzione */
authRouter.get("/debug-session", (req: Request, res: Response) => {
  res.json({
    has_session: !!req.session,
    session_id: req.sessionID,
    is_authenticated: req.isAuthenticated ? req.isAuthenticated() : null,
    user: req.user || null,
    cookies_received: Object.keys(req.cookies || {}),
    headers_cookie_present: !!req.headers.cookie,
    node_env: process.env.NODE_ENV,
    protocol: req.protocol,
    secure: req.secure,
  });
});
