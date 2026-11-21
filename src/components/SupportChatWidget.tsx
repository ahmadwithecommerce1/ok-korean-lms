import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  RotateCcw, 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  Fingerprint, 
  FileSpreadsheet, 
  Receipt, 
  UserCheck 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const STORAGE_KEY = 'm_ahmad_ecommerce_chat_history_v1';

const INITIAL_GREETING: ChatMessage = {
  id: 'greeting_msg',
  sender: 'bot',
  text: "Hello! I am **M. Ahmad E-Commerce**, your dedicated AI technical support assistant for the OK Korean Language Center portal.\n\nI can help you troubleshoot issues, configure ZKTeco K40 biometric devices, manage student enrollments, excel bulk imports, or navigate fee ledgers. How can I assist you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const SUGGESTIONS = [
  { label: 'ZKTeco K40 Sync Help', icon: Fingerprint, prompt: 'How do I connect and sync attendance with the ZKTeco K40 biometric device?' },
  { label: 'Excel Bulk Upload', icon: FileSpreadsheet, prompt: 'What is the required Excel format for bulk student upload?' },
  { label: 'Biometric Verification', icon: UserCheck, prompt: 'How do I verify a student whose status is "Pending Verification"?' },
  { label: 'Generate Fee Challan', icon: Receipt, prompt: 'How can I generate and print PKR Tuition Fee challan vouchers?' }
];

export const SupportChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [INITIAL_GREETING];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearChat = () => {
    setMessages([
      {
        ...INITIAL_GREETING,
        id: `greeting_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const getFallbackSolution = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('zkteco') || q.includes('k40') || q.includes('fingerprint') || q.includes('biometric') || q.includes('adms')) {
      return `**Step-by-Step ZKTeco K40 Device Setup:**

1. **Verify Device Connection:**
   - In the sidebar or top navigation, click the **ZKTeco K40 (ADMS)** widget or settings.
   - Ensure the IP address matches your device (Default: \`192.168.1.201\`, Port: \`4370\`).
   - If using cloud ADMS push, point the device server IP to this portal's address with port \`3000\`.

2. **Student Biometric Enrollment:**
   - Navigate to **Student Directory**.
   - Students with **"Pending Verification"** will show a **"Send Enroll Request"** action.
   - Click it to queue command \`ENROLL_FP\` with the student's unique PIN.
   - Instruct the student to place their thumb 3 times on the K40 sensor. Once captured, their status changes automatically to **Active**.

3. **Real-Time Punch Sync:**
   - Fingerprint scans immediately write to Firestore \`attendance\` collection with \`status: Present\` and log into the audit trail.`;
    }

    if (q.includes('excel') || q.includes('bulk') || q.includes('upload') || q.includes('import')) {
      return `**Excel Bulk Student Upload Instructions:**

1. Go to the **Student Directory** page.
2. Click the **"Import Excel"** button in the header bar.
3. Prepare your spreadsheet (\`.xlsx\` or \`.csv\`) with the following columns:
   - **Roll No** (e.g., \`OK-2025-101\`)
   - **Full Name** (e.g., \`Muhammad Ali\`)
   - **Father Name** (e.g., \`Tariq Ali\`)
   - **Parent WhatsApp** (e.g., \`+92 300 1234567\`)
   - **Batch** (e.g., \`Batch A (Morning)\`)
   - **Level** (e.g., \`Level 1 - Beginner\`)
4. Drag and drop your file into the upload zone and click **"Commit to Firestore"**. All records will be imported with automated PIN generation.`;
    }

    if (q.includes('fee') || q.includes('challan') || q.includes('payment') || q.includes('tuition') || q.includes('ledger')) {
      return `**PKR Tuition Fee Ledger & Challan Generation:**

1. Navigate to the **Fee Ledger** tab from the main menu.
2. Select any student row and click **"Generate Challan"**.
3. Choose the billing month, tuition amount (in PKR), and due date.
4. Click **"Print / Download PDF"** to produce an official 3-copy voucher (Student Copy, Bank/Accounts Copy, Academy Copy) complete with official seals and QR verification.`;
    }

    if (q.includes('test') || q.includes('topik') || q.includes('score') || q.includes('exam')) {
      return `**Weekly & TOPIK Test Management:**

1. Navigate to **Weekly Tests** in the navigation bar.
2. Click **"New Test Entry"** to record weekly Korean vocabulary, listening, or grammar scores.
3. The system calculates class percentages and updates each student's progress towards TOPIK I or EPS-TOPIK benchmarks automatically.`;
    }

    return `Thank you for reaching out to **M. Ahmad E-Commerce Support**.

Here are some general troubleshooting steps:
1. **Refresh Data:** Click the sync icon in the top header to refresh real-time Firestore synchronization.
2. **Permissions:** Ensure you are logged into an Admin account to perform enrollment or configuration edits.
3. **Network Connection:** Verify your local network can reach the LMS server and the ZKTeco K40 IP.

If you have a specific error message or need help with a particular screen, please describe it and I will guide you step by step!`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const recentHistory = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: recentHistory
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          const botMsg: ChatMessage = {
            id: `msg_bot_${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, botMsg]);
          setIsTyping(false);
          return;
        }
      }

      // If server responded with error status or empty reply
      const fallbackReply = getFallbackSolution(text);
      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
      clearTimeout(timeoutId);
      // Graceful instant fallback when timed out or network error
      const fallbackReply = getFallbackSolution(text);
      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to format basic markdown-style text safely
  const formatBotMessage = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // Bold text formatting
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
        }
        // Code formatting
        if (part.includes('`')) {
          const codeParts = part.split(/(`.*?`)/g);
          return (
            <React.Fragment key={pIdx}>
              {codeParts.map((cp, cpIdx) => {
                if (cp.startsWith('`') && cp.endsWith('`')) {
                  return (
                    <code key={cpIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700/60">
                      {cp.slice(1, -1)}
                    </code>
                  );
                }
                return cp;
              })}
            </React.Fragment>
          );
        }
        return part;
      });

      return (
        <React.Fragment key={idx}>
          {renderedLine}
          {idx < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <aside 
      role="complementary"
      aria-label="AI Technical Support Assistant"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none"
    >
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="pointer-events-auto mb-4 w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[82vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 transition-all duration-300 transform scale-100 origin-bottom-right"
          style={{
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.15)'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 border border-indigo-400/30">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900"></span>
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  M. Ahmad E-Commerce Support
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[11px] font-medium text-emerald-400">Online</span>
                  <span className="text-slate-500 text-[10px]">•</span>
                  <span className="text-[10px] text-slate-400">AI Assistant</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reset conversation"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Support"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1 pl-1 shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Topics:
            </span>
            {SUGGESTIONS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isTyping}
                className="whitespace-nowrap px-2 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 border border-slate-700/50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <item.icon className="w-3 h-3 text-indigo-400" />
                {item.label}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-xs shadow-md shadow-black/20'
                  }`}
                >
                  {msg.sender === 'bot' ? formatBotMessage(msg.text) : msg.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-xs bg-slate-800/90 border border-slate-700/70 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="text-[10px] text-slate-400 font-medium ml-1">M. Ahmad is replying...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask technical support question..."
                disabled={isTyping}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-hidden transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-indigo-400/70" /> Enterprise Support
              </span>
              <span>M. Ahmad E-Commerce</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-slate-200 text-xs font-medium border border-indigo-500/30 shadow-lg cursor-pointer hover:border-indigo-500/60 transition-all hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>M. Ahmad Support</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="relative group p-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 text-white shadow-xl hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-300 hover:scale-110 active:scale-95 border border-indigo-400/40 cursor-pointer"
          aria-label={isOpen ? "Close M. Ahmad E-Commerce Support" : "Open M. Ahmad E-Commerce Support"}
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-6 h-6" />
              <span className="absolute top-0 right-0 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
