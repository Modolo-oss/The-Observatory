import { useState, useRef, useEffect } from "react";
import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function BenchmarkAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when widget opens
  const { data: chatHistory } = useQuery<Message[]>({
    queryKey: ["/api/ai/chat/history"],
    enabled: isOpen && !historyLoaded,
  });

  useEffect(() => {
    if (chatHistory && !historyLoaded) {
      if (chatHistory.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: "👋 Hi! I'm your Benchmark Assistant. I can help you analyze benchmark results, interpret performance metrics, and provide insights about Gateway's performance. What would you like to know?",
          },
        ]);
      } else {
        setMessages(chatHistory);
      }
      setHistoryLoaded(true);
    }
  }, [chatHistory, historyLoaded]);

  const chatMutation = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/ai/chat", { message }),
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "I apologize, but I couldn't process that request." },
      ]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQueries = [
    "What's the average latency in my recent benchmarks?",
    "How does my success rate trend over time?",
    "Compare my last two benchmark runs",
    "What can I do to improve transaction cost?",
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110"
        data-testid="button-open-benchmark-assistant"
      >
        <BarChart3 className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-96 h-[600px] z-50">
      <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-2 border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-primary/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Benchmark Assistant</h3>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                <p className="text-xs text-muted-foreground">Ready to help</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
            data-testid="button-close-benchmark-assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.role === "user"
                    ? "bg-gradient-to-br from-cyan-500 to-blue-500"
                    : "bg-gradient-to-br from-primary to-purple-500"
                )}
              >
                {message.role === "user" ? (
                  <span className="text-xs font-bold">You</span>
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[75%]",
                  message.role === "user"
                    ? "bg-primary/20 border border-primary/30"
                    : "bg-white/5 border border-white/10"
                )}
                data-testid={`chat-message-${i}`}
              >
                {message.role === "assistant" ? (
                  <div className="text-sm prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-75" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(query);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  data-testid={`suggested-query-${i}`}
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your benchmarks..."
              className="flex-1"
              disabled={chatMutation.isPending}
              data-testid="input-benchmark-assistant"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              className="bg-gradient-to-r from-primary to-primary/80"
              data-testid="button-send-benchmark-assistant"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
