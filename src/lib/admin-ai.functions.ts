import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().trim().min(2).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).optional(),
});

/**
 * The in-app admin operator. Only the admin account can call it.
 * It can change what the live site shows (theories, stories, users, announcements)
 * straight from the database — no redeploy needed.
 */
export const adminAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { responsesRun, userItem } = await import("./responses.server");
    const { SEARCH_TOOL, runSearchTool } = await import("./ai-tools.server");
    const slugify = (s: string) =>
      s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const tools = [
      SEARCH_TOOL,
      {
        type: "function" as const,
        name: "list_theories",
        description: "List existing theories (id, show, headline).",
        strict: true as const,
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
      {
        type: "function" as const,
        name: "add_theory",
        description: "Publish a new theory to the live Theories page.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: {
            show_title: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
            poster_url: { type: "string" },
          },
          required: ["show_title", "title", "body", "poster_url"],
          additionalProperties: false,
        },
      },
      {
        type: "function" as const,
        name: "update_theory",
        description: "Edit an existing theory by id.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" } },
          required: ["id", "title", "body"],
          additionalProperties: false,
        },
      },
      {
        type: "function" as const,
        name: "delete_theory",
        description: "Remove a theory by id.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
          additionalProperties: false,
        },
      },
      {
        type: "function" as const,
        name: "list_stories",
        description: "List Screen Writer stories with their public/private state.",
        strict: true as const,
        parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
      {
        type: "function" as const,
        name: "set_story_public",
        description: "Publish or unpublish a story by id.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: { id: { type: "string" }, is_public: { type: "boolean" } },
          required: ["id", "is_public"],
          additionalProperties: false,
        },
      },
      {
        type: "function" as const,
        name: "set_user_banned",
        description: "Ban or unban a user by their username.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: { username: { type: "string" }, banned: { type: "boolean" } },
          required: ["username", "banned"],
          additionalProperties: false,
        },
      },
      {
        type: "function" as const,
        name: "broadcast",
        description: "Send an announcement notification to every user.",
        strict: true as const,
        parameters: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
          additionalProperties: false,
        },
      },
    ];

    const runTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
      const s = (k: string) => String(args[k] ?? "");
      switch (name) {
        case "web_search":
          return runSearchTool(name, args);
        case "list_theories": {
          const { data: rows } = await supabaseAdmin
            .from("theories")
            .select("id, show_title, title")
            .order("show_title")
            .limit(200);
          return JSON.stringify(rows ?? []);
        }
        case "add_theory": {
          const show = s("show_title");
          const { error } = await supabaseAdmin.from("theories").insert({
            show_title: show,
            show_slug: slugify(show),
            poster_url: s("poster_url") || null,
            title: s("title"),
            body: s("body"),
            sort_order: 100,
          } as never);
          return error ? `Error: ${error.message}` : "Theory published.";
        }
        case "update_theory": {
          const { error } = await supabaseAdmin
            .from("theories")
            .update({ title: s("title"), body: s("body") })
            .eq("id", s("id"));
          return error ? `Error: ${error.message}` : "Theory updated.";
        }
        case "delete_theory": {
          const { error } = await supabaseAdmin.from("theories").delete().eq("id", s("id"));
          return error ? `Error: ${error.message}` : "Theory deleted.";
        }
        case "list_stories": {
          const { data: rows } = await supabaseAdmin
            .from("sw_projects")
            .select("id, title, is_public")
            .order("updated_at", { ascending: false })
            .limit(100);
          return JSON.stringify(rows ?? []);
        }
        case "set_story_public": {
          const { error } = await supabaseAdmin
            .from("sw_projects")
            .update({ is_public: Boolean(args.is_public) })
            .eq("id", s("id"));
          return error ? `Error: ${error.message}` : "Story visibility updated.";
        }
        case "set_user_banned": {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("username", s("username"))
            .maybeSingle();
          if (!prof) return "No user with that username.";
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_banned: Boolean(args.banned) })
            .eq("id", prof.id);
          return error ? `Error: ${error.message}` : "User updated.";
        }
        case "broadcast": {
          const { data: users } = await supabaseAdmin.from("profiles").select("id");
          if (!users?.length) return "No users.";
          await supabaseAdmin.from("notifications").insert(
            users.map((u) => ({ user_id: u.id, kind: "broadcast", payload: { message: s("message") } })) as never,
          );
          return `Sent to ${users.length} users.`;
        }
        default:
          return "Unknown tool";
      }
    };

    const history = (data.history ?? []).map((m) => ({
      type: "message",
      role: m.role,
      content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }],
    }));

    const { text, toolsUsed } = await responsesRun({
      instructions:
        "You are the SPOILED control room operator, talking only to Salem, the site owner. You can change what the live site shows right now using your tools: theories, story publishing, users and announcements. Be decisive: when Salem asks for a change, make it with the tools and then confirm plainly in one or two sentences. Use web_search for facts. Never claim you changed something you did not.",
      input: [...history, userItem(data.prompt, [])],
      tools,
      runTool,
      reasoning: "low",
      maxSteps: 8,
    });

    return { text, toolsUsed };
  });
