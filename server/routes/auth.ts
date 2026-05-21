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
