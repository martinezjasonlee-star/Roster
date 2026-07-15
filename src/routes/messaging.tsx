import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";
import { getConversations, getMessagesBetween, sendMessage, getUserByEmail } from "~/lib/server";

export const Route = createFileRoute("/messaging")({
  component: Messaging,
});

function Messaging() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [myProfile, setMyProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parse contact ID from query string if redirected from elsewhere (dashboard, browse, etc.)
  const getContactQueryParam = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("contact");
  };

  const loadInitialData = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    const email = user.emailAddresses[0].emailAddress;

    try {
      // 1. Get my profile type & id
      const profile = await getUserByEmail({ data: email });
      setMyProfile(profile);

      // 2. Get active conversation threads
      const convs = await getConversations({ data: email });
      setConversations(convs);

      // 3. Handle query param for "contact"
      const contactParam = getContactQueryParam();
      if (contactParam) {
        // Find if this contact is already in our list
        const existing = convs.find((c: any) => c.id === contactParam);
        if (existing) {
          setSelectedContact(existing);
        } else {
          // If they are not in the list yet, create a pseudo-contact so we can load messaging history
          setSelectedContact({
            id: contactParam,
            name: "Active Chat",
            subtitle: "Connecting...",
            type: profile.type === "business" ? "worker" : "business",
          });
        }
      } else if (convs.length > 0) {
        // Fallback to select first conversation if no contact param is set
        setSelectedContact(convs[0]);
      }
    } catch (err) {
      console.error("Error loading messaging data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Load initial threads
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // 2. Poll messages for the currently selected contact
  const fetchMessages = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress || !selectedContact) return;
    const email = user.emailAddresses[0].emailAddress;
    try {
      const msgs = await getMessagesBetween({
        data: { email, otherUserId: selectedContact.id },
      });
      setMessages(msgs);
    } catch (err) {
      console.error("Error polling messages:", err);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      fetchMessages();

      // Poll every 5 seconds for new messages
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  // 3. Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user?.emailAddresses?.[0]?.emailAddress || !selectedContact) return;
    const email = user.emailAddresses[0].emailAddress;
    setSending(true);

    try {
      const res = await sendMessage({
        data: {
          email,
          recipientId: selectedContact.id,
          content: input.trim(),
          bookingId: selectedContact.booking_id,
        },
      });

      if (res.success) {
        setInput("");
        await fetchMessages();
      } else {
        alert("Failed to send message.");
      }
    } catch (err) {
      alert("Error sending message.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.href = "/auth/sign-in";
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <p className="text-[#0F172A] font-semibold">Loading messages...</p>
      </div>
    );
  }

  if (!isSignedIn) return null;

  const getDashboardUrl = () => {
    if (myProfile?.type === "business") return "/dashboard";
    if (myProfile?.type === "worker") return "/worker-dashboard";
    return "/";
  };

  return (
    <div className="min-h-screen bg-[#F8F6F3] flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="20" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="12" width="16" height="4" rx="2" fill="#0F172A"/>
              <rect x="0" y="19" width="12" height="4" rx="2" fill="#E8633B"/>
            </svg>
            <span className="font-bold text-lg text-[#0F172A]">Roster Message Center</span>
          </div>
          <a href={getDashboardUrl()} className="text-sm font-semibold text-[#0F172A] hover:text-[#E8633B] transition">
            ← Back to Dashboard
          </a>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Conversations List */}
        <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-shrink-0 h-[40vh] md:h-auto overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <h2 className="font-bold text-[#0F172A] text-sm flex items-center gap-2">
              <span>💬</span> Inbox Conversations
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {conversations.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400">
                <p className="text-2xl mb-1">📬</p>
                <p className="text-xs font-semibold">No active connections</p>
                <p className="text-[11px] mt-1">Book or apply to a shift to open messaging channels.</p>
              </div>
            ) : (
              conversations.map((c: any) => {
                const isSelected = selectedContact?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    className={`w-full text-left p-4 hover:bg-slate-50/80 transition flex items-start gap-3 ${
                      isSelected ? "bg-slate-50/90 border-l-4 border-[#E8633B]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{c.name[0]}</span>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-[#0F172A] truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{c.subtitle}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full">
          
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-xs flex-shrink-0">
                  {selectedContact.photo_url ? (
                    <img src={selectedContact.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedContact.name[0]}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">{selectedContact.name}</h3>
                  <p className="text-xs text-[#E8633B] font-semibold capitalize mt-0.5">{selectedContact.subtitle}</p>
                </div>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <p className="text-4xl mb-3">💬</p>
                    <p className="font-semibold text-[#0F172A]">Start the conversation</p>
                    <p className="text-xs mt-1">Send a message to introduce yourself or align on details.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMine = msg.sender_id === myProfile?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                          isMine
                            ? "bg-[#E8633B] text-white rounded-br-sm"
                            : "bg-slate-100 text-[#0F172A] rounded-bl-sm"
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] text-right mt-1.5 ${isMine ? "text-white/70" : "text-slate-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Chat Input Field */}
              <div className="p-4 border-t border-slate-100 flex gap-2 bg-white flex-shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={`Send a message to ${selectedContact.name}...`}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#E8633B] focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-[#E8633B] hover:bg-[#d4552e] text-white font-bold px-6 py-3 rounded-xl text-sm transition disabled:opacity-40 flex-shrink-0"
                >
                  {sending ? "Sending" : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="font-bold text-lg text-[#0F172A] mb-1">Select a Conversation</h3>
              <p className="text-sm max-w-sm mx-auto">Select an inbox contact from the left list to view message history and send new messages.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
