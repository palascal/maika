import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.104.0";
import { corsHeaders } from "../_shared/cors.ts";

type AppRole = "user" | "orga" | "admin";

type Change = {
  playerId: string;
  previousEmail: string | null;
  nextEmail: string | null;
  previousRole: AppRole;
  nextRole: AppRole;
};

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const normalizeRole = (raw: unknown): AppRole => (raw === "admin" ? "admin" : raw === "orga" ? "orga" : "user");

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<User | null> {
  const want = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users;
    const found = users.find((u) => (u.email ?? "").toLowerCase() === want);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

function randomPassword(): string {
  const u = crypto.randomUUID();
  return `${u}Aa1!`;
}

async function ensureAuthUserForEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
  role: AppRole,
  inviteRedirectTo: string | undefined,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await findUserByEmail(admin, email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...(existing.app_metadata ?? {}), role },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectTo,
    data: { source: "maika_player_admin", role },
  });
  if (!invErr) return { ok: true };
  if (/already|registered|exists|duplicate/i.test(invErr.message)) return { ok: true };

  const { error: cuErr } = await admin.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { source: "maika_player_admin" },
  });
  if (cuErr) return { ok: false, message: `${invErr.message} ; secours createUser : ${cuErr.message}` };
  return { ok: true };
}

async function applyChange(
  admin: ReturnType<typeof createClient>,
  ch: Change,
  callerRole: AppRole,
  inviteRedirectTo: string | undefined,
): Promise<{ playerId: string; ok: true } | { playerId: string; ok: false; error: string }> {
  const { playerId, previousEmail, nextEmail, nextRole } = ch;

  if (callerRole !== "admin" && nextRole !== "user") {
    return { playerId, ok: false, error: "Seul un admin peut attribuer les rôles orga/admin." };
  }

  if (!nextEmail) {
    return { playerId, ok: true };
  }
  if (previousEmail && previousEmail === nextEmail) {
    const u = await findUserByEmail(admin, nextEmail);
    if (!u) return { playerId, ok: true };
    const { error } = await admin.auth.admin.updateUserById(u.id, { app_metadata: { ...(u.app_metadata ?? {}), role: nextRole } });
    if (error) return { playerId, ok: false, error: error.message };
    return { playerId, ok: true };
  }

  if (previousEmail && previousEmail !== nextEmail) {
    const u = await findUserByEmail(admin, previousEmail);
    if (!u) {
      const r = await ensureAuthUserForEmail(admin, nextEmail, nextRole, inviteRedirectTo);
      return r.ok ? { playerId, ok: true } : { playerId, ok: false, error: r.message };
    }
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      email: nextEmail,
      app_metadata: { ...(u.app_metadata ?? {}), role: nextRole },
    });
    if (error) return { playerId, ok: false, error: error.message };
    return { playerId, ok: true };
  }

  const r = await ensureAuthUserForEmail(admin, nextEmail, nextRole, inviteRedirectTo);
  return r.ok ? { playerId, ok: true } : { playerId, ok: false, error: r.message };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée" }), { status: 405, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Session manquante" }), { status: 401, headers: jsonHeaders });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: jsonHeaders });
    }
    const callerRole = normalizeRole((caller.app_metadata as { role?: string } | undefined)?.role);
    if (callerRole !== "admin" && callerRole !== "orga") {
      return new Response(JSON.stringify({ error: "Réservé aux rôles orga/admin" }), { status: 403, headers: jsonHeaders });
    }

    const body = (await req.json()) as { changes?: unknown };
    const raw = body?.changes;
    if (!Array.isArray(raw)) {
      return new Response(JSON.stringify({ error: "Corps JSON invalide (attendu : changes[])" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (raw.length === 0) {
      return new Response(JSON.stringify({ ok: true, results: [] }), { status: 200, headers: jsonHeaders });
    }
    if (raw.length > 100) {
      return new Response(JSON.stringify({ error: "Trop de modifications (max 100)" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const changes: Change[] = [];
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const playerId = typeof o.playerId === "string" ? o.playerId : "";
      const prev = o.previousEmail === null || o.previousEmail === undefined
        ? null
        : typeof o.previousEmail === "string"
        ? o.previousEmail.trim().toLowerCase()
        : null;
      const next = o.nextEmail === null || o.nextEmail === undefined
        ? null
        : typeof o.nextEmail === "string"
        ? o.nextEmail.trim().toLowerCase()
        : null;
      const prevRole = normalizeRole(o.previousRole);
      const nextRole = normalizeRole(o.nextRole);
      if (!playerId) {
        return new Response(JSON.stringify({ error: "Chaque entrée doit avoir un playerId" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
      if (prev !== null && prev !== "" && !emailOk(prev)) {
        return new Response(JSON.stringify({ error: `E-mail précédent invalide (${playerId})` }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
      if (next !== null && next !== "" && !emailOk(next)) {
        return new Response(JSON.stringify({ error: `E-mail invalide (${playerId})` }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
      changes.push({
        playerId,
        previousEmail: prev && prev.length > 0 ? prev : null,
        nextEmail: next && next.length > 0 ? next : null,
        previousRole: prevRole,
        nextRole,
      });
    }

    const inviteRedirectTo = Deno.env.get("INVITE_REDIRECT_TO")?.trim() || undefined;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Array<{ playerId: string; ok: boolean; error?: string }> = [];
    for (const ch of changes) {
      try {
        const r = await applyChange(admin, ch, callerRole, inviteRedirectTo);
        if (r.ok) results.push({ playerId: r.playerId, ok: true });
        else results.push({ playerId: r.playerId, ok: false, error: r.error });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ playerId: ch.playerId, ok: false, error: msg });
      }
    }

    const partialErrors = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({
        ok: partialErrors.length === 0,
        results,
        partialErrors,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
