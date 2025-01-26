import { useRef, useState, useEffect } from "react";
import { MessageSquare, Send, Mic } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { AgenticWorkflow } from "../../agentic_workflow/AgenticWorkflow";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent" | "error";
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agent] = useState(() => new AgenticWorkflow("Chat Agent", "A helpful chat agent"));

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText("");

      // Get agent response
      const response = await agent.processMessage(inputText);
      
      // Add agent response
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "agent",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, agentMessage]);

    } catch (error) {
      console.error("Failed to process message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Failed to process message. Please try again.",
        sender: "error",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Chat
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col h-[calc(100vh-16rem)]">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80