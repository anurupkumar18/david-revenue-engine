#!/usr/bin/env tsx

const API_BASE = process.env.EMAIL_LOOP_API_BASE || process.env.API_BASE_URL || "http://127.0.0.1:8000/api";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

function profilePayload() {
  return {
    fields: {
      company_name: "Loop Demo",
      website_url: "https://loop.demo",
      product_description: "Automated back-and-forth email demo.",
    },
    confidence: {
      company_name: "high",
      website_url: "high",
    },
    status: "accepted",
  };
}

function sequencePayload() {
  return {
    sends: [
      {
        account_id: "loop_acc_1",
        contact_email: "prospect@example.com",
        grade: "A",
        step1: {
          subject: "quick idea",
          body: "missed calls are costing you pipeline. worth a look?",
          validated: true,
        },
        step2: {
          subject: "worth trying",
          body: "following up on the missed calls angle. send specifics?",
          validated: true,
        },
      },
    ],
  };
}

async function main() {
  console.log(`Using API base: ${API_BASE}`);
  await request("/health");

  const profile = await request<{ id: number }>("/profiles", {
    method: "POST",
    body: JSON.stringify(profilePayload()),
  });
  assert(profile.id > 0, "profile id missing");

  const sequence = await request<{ jobs_created: number }>('/sequences/' + profile.id + '/start', {
    method: "POST",
    body: JSON.stringify(sequencePayload()),
  });
  assert(sequence.jobs_created === 2, "expected two queued jobs");

  const drain = await request<{ sent: number }>('/send-jobs/' + profile.id + '/run', {
    method: "POST",
  });
  assert(drain.sent === 1, "expected first step to send immediately");

  const threads = await request<{ threads: Array<{ thread_id: string }> }>('/threads/' + profile.id);
  assert(threads.threads.length === 1, "expected one active thread");
  const threadId = threads.threads[0]?.thread_id;
  assert(threadId, "thread id missing");

  const firstReply = await request<{
    decision: { auto_send: boolean; reason: string };
    draft: { routed: { intent: string }; subject: string };
    thread: { message_count: number };
  }>("/email/simulate-inbound", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profile.id,
      account_id: "loop_acc_1",
      contact_email: "prospect@example.com",
      subject: "re: quick idea",
      body: "Sure, happy to chat next week.",
      grade: "A",
    }),
  });
  assert(firstReply.decision.auto_send === true, "first reply should auto-send");
  assert(firstReply.draft.routed.intent === "positive_call", "first reply should classify as positive");

  const detailAfterFirst = await request<{
    messages: Array<{ direction: string; status: string; esp_message_id: string | null; subject: string }>;
  }>('/threads/detail/' + threadId);
  const outboundAfterFirst = [...detailAfterFirst.messages].reverse().find((msg) => msg.direction === "outbound" && msg.status === "sent");
  assert(outboundAfterFirst?.esp_message_id, "first outbound reply was not sent");

  const secondReply = await request<{
    decision: { auto_send: boolean; reason: string };
    draft: { routed: { intent: string }; subject: string };
    thread: { message_count: number };
  }>("/email/simulate-inbound", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profile.id,
      account_id: "loop_acc_1",
      contact_email: "prospect@example.com",
      in_reply_to: outboundAfterFirst.esp_message_id,
      subject: "re: next step",
      body: "Can you send more info and pricing?",
      grade: "A",
    }),
  });
  assert(secondReply.decision.auto_send === true, "second reply should auto-send");
  assert(secondReply.draft.routed.intent === "asks_for_info", "second reply should classify as asks_for_info");

  const detailAfterSecond = await request<{
    message_count: number;
    messages: Array<{ direction: string; status: string; subject: string }>;
  }>('/threads/detail/' + threadId);
  assert(detailAfterSecond.message_count >= 5, "expected a back-and-forth thread");

  const outboundCount = detailAfterSecond.messages.filter((msg) => msg.direction === "outbound" && msg.status === "sent").length;
  const inboundCount = detailAfterSecond.messages.filter((msg) => msg.direction === "inbound").length;
  assert(outboundCount >= 3, "expected the two automated replies plus the initial outbound send");
  assert(inboundCount >= 2, "expected two inbound replies");

  console.log("");
  console.log("Email round-trip demo passed.");
  console.log(`Profile ID: ${profile.id}`);
  console.log(`Thread ID: ${threadId}`);
  console.log(`Inbound messages: ${inboundCount}`);
  console.log(`Outbound sent messages: ${outboundCount}`);
  console.log(`First reply: ${firstReply.draft.routed.intent} -> auto_send=${firstReply.decision.auto_send}`);
  console.log(`Second reply: ${secondReply.draft.routed.intent} -> auto_send=${secondReply.decision.auto_send}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Email round-trip verification failed: ${message}`);
  process.exit(1);
});
