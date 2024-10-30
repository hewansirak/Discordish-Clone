"use client"

import { useState } from "react";

interface Message {
  sender: string,
  content: string,
}


export default function Home() {
  const[messages, setMessages] = useState<Message[]>([
    {sender: "Alice", content: "Hello, World!"},
    {sender: "Bob", content: "Hi, there!"}
  ]);
  
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessages([...messages, {sender: "Alice", content: input}]);
    setInput("");
  }
  
  return (
    <div>
      {messages.map((message, index) => (
      <div key={index}>
        <strong>{message.sender}</strong>{message.content}</div>
    ))}
    <form onSubmit={handleSubmit}>
      <input type="text" name="message" id="message"  value={input} onChange={e => setInput(e.target.value)}/>
      <button type="submit">Send</button>
    </form>
    </div>
  );
}
