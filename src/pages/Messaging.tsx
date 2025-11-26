import { useState } from "react";
import { Send, Phone, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const conversations = [
  {
    id: 1,
    name: "Sarah Chen",
    avatar: undefined,
    lastMessage: "Thanks for the quick response!",
    time: "2m ago",
    unread: 2,
    orderId: "ORD-1001",
  },
  {
    id: 2,
    name: "Mike Johnson",
    avatar: undefined,
    lastMessage: "Can we discuss the menu options?",
    time: "1h ago",
    unread: 0,
    orderId: "ORD-1002",
  },
  {
    id: 3,
    name: "Emma Wilson",
    avatar: undefined,
    lastMessage: "Looking forward to the event!",
    time: "3h ago",
    unread: 1,
    orderId: "BID-003",
  },
];

const messages = [
  { id: 1, sender: "client", text: "Hi! I'd like to discuss the catering for my event", time: "10:30 AM" },
  { id: 2, sender: "vendor", text: "Hello! I'd be happy to help. What type of event are you planning?", time: "10:32 AM" },
  { id: 3, sender: "client", text: "It's a corporate gala for 150 people", time: "10:35 AM" },
  { id: 4, sender: "vendor", text: "Perfect! I can definitely accommodate that. Would you prefer a buffet or plated service?", time: "10:37 AM" },
];

export default function Messaging() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Handle send message
      setMessageText("");
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Messaging</h1>
        <p className="text-muted-foreground">Communicate with your clients in real-time</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-10" />
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex cursor-pointer items-start gap-3 border-b p-4 transition-smooth hover:bg-accent ${
                    selectedConversation.id === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={conv.avatar} />
                    <AvatarFallback>{conv.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{conv.name}</p>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{conv.lastMessage}</p>
                    <p className="text-xs text-muted-foreground">Order: {conv.orderId}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {conv.unread}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedConversation.avatar} />
                  <AvatarFallback>{selectedConversation.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConversation.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedConversation.orderId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[480px] p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "vendor" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender === "vendor"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className="mt-1 text-xs opacity-70">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={handleSendMessage} size="icon" className="h-auto">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
