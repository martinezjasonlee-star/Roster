import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";

const getMessages = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const result = execSync(`sqlite3 -json /home/team/.data/agent-team-cc229006.db "SELECT m.id, m.sender_type, m.sender_id, m.content, m.is_read, m.created_at FROM messages m WHERE m.sender_id='${data.userId}' OR m.sender_id IN (SELECT id FROM workers WHERE id='${data.userId}') ORDER BY m.created_at DESC LIMIT 50"`);
    return JSON.parse(result.toString());
  });

const sendMessage = createServerFn({ method: "POST" })
  .validator((data: { sender_type: string; sender_id: string; booking_id: string; content: string }) => data)
  .handler(async ({ data }) => {
    const { execSync } = await import("node:child_process");
    const id = crypto.randomUUID();
    execSync(`sqlite3 /home/team/.data/agent-team-cc229006.db "INSERT INTO messages (id, sender_type, sender_id, booking_id, content) VALUES ('${id}', '${data.sender_type}', '${data.sender_id}', '${data.booking_id}', '${data.content.replace(/'/g, "''")}')"`);
    return { success: true, messageId: id };
  });

export const Route = createFileRoute("/messaging")({
  component: Messaging,
});

function Messaging() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-in";
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!userId) return;
    getMessages({ data: { userId } }).then(setMessages);
    const interval = setInterval(() => {
      getMessages({ data: { userId } }).then(setMessages);
    }, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    setSending(true);
    try {
      await sendMessage({
        data: {
          sender_type: userId.startsWith("user_") ? "worker" : "business",
          sender_id: userId,
          booking_id: "general",
          content: input.trim(),
        },
      });
      setInput("");
      const updated = await getMessages({ data: { userId } });
      setMessages(updated);
    } catch (e) { alert("Failed to send"); }
    setSending(false);
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center"><p className="text-[#0F172A]">Loading...</p></div>;
  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg">Messages</span>
          </div>
          <a href="/dashboard" className="text-sm text-[#0F172A] hover:text-[#0F172A]">← Dashboard</a>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 flex flex-col">
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6 overflow-y-auto max-h-[60vh] mb-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-[#0F172A]">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm">Messages about your shifts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-4 py-2.5 ${
                    msg.sender_id === userId
                      ? "bg-[#E8633B] text-white rounded-br-sm"
                      : "bg-slate-100 text-[#0F172A] rounded-bl-sm"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === userId ? "text-white/70" : "text-[#0F172A]"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#E8633B]"
          />
          <button onClick={handleSend} disabled={sending || !input.trim()}
            className="bg-[#E8633B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d4552e] transition disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}