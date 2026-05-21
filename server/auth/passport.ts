import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { User } from "@shared/schema";

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback";

  if (!clientID || !clientSecret) {
    console.warn("[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET non impostati — Google SSO disabilitato");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ["profile", "email"],
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google profile senza email"));
          }

          // Cerca per google_sub, fallback su email
          let row: User | undefined =
            (
              await db.select().from(users).where(eq(users.googleSub, profile.id)).limit(1)
            )[0] ||
            (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

          if (!row) {
            // Auto-create solo se l'email è whitelisted
            const allowed = (process.env.ALLOWED_EMAILS || "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            if (allowed.length > 0 && !allowed.includes(email)) {
              return done(null, false, { message: `Email ${email} non autorizzata` });
            }

            const [created] = await db
              .insert(users)
              .values({
                email,
                googleSub: profile.id,
                nome: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                role: "viewer", // default ruolo basso, admin promuove manualmente
              })
              .returning();
            row = created;
          } else {
            // Aggiorna google_sub se mancante + dati profilo + last_login_at
            await db
              .update(users)
              .set({
                googleSub: row.googleSub || profile.id,
                nome: row.nome || profile.displayName,
                avatarUrl: profile.photos?.[0]?.value || row.avatarUrl,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(users.id, row.id));
          }

          if (!row.attivo) {
            return done(null, false, { message: "Account disattivato" });
          }

          return done(null, {
            id: row.id,
            email: row.email,
            role: row.role,
            nome: row.nome,
          });
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const row = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
      if (!row || !row.attivo) return done(null, false);
      done(null, {
        id: row.id,
        email: row.email,
        role: row.role,
        nome: row.nome,
      });
    } catch (err) {
      done(err);
    }
  });
}
