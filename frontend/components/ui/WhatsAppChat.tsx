'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

interface ChatMessage {
  sender: 'SCAMMER' | 'USER'
  timestamp: string
  content: string
}

interface PaymentBlock {
  link: string
  amount: string
  qr: string
  cta: string
}

interface WhatsAppChatProps {
  messages: ChatMessage[]
  paymentBlock?: PaymentBlock
  isLoading?: boolean
  userName?: string
  scammerName?: string
}

export default function WhatsAppChat({
  messages,
  paymentBlock,
  isLoading = false,
  userName = "You",
  scammerName = "Bro"
}: WhatsAppChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages])

  // Animate messages in
  useEffect(() => {
    setDisplayedMessages(messages)
  }, [messages])

  const getSenderLabel = (sender: string) => {
    return sender === 'SCAMMER' ? scammerName : userName
  }

  const getSenderColor = (sender: string) => {
    if (sender === 'SCAMMER') {
      return 'bg-gray-200 text-gray-900' // Scammer messages - light gray
    } else {
      return 'bg-green-500 text-white' // User messages - WhatsApp green
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
      {/* Header - WhatsApp style */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-purple-500/30 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg">
              {scammerName[0]}
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full absolute bottom-0 right-0 border-2 border-gray-800"></div>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{scammerName}</h3>
            <p className="text-gray-400 text-xs">Active now</p>
          </div>
        </div>
        <div className="text-gray-400 text-xl">⋮</div>
      </div>

      {/* Chat Messages - WhatsApp style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
        {/* Date separator */}
        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-xs">Today</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        {displayedMessages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.sender === 'SCAMMER' ? 'justify-start' : 'justify-end'}`}
          >
            <div className="flex flex-col gap-1 max-w-[70%]">
              <div className={`px-3 py-2 rounded-lg ${getSenderColor(msg.sender)} break-words shadow-lg`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
              <span className="text-gray-500 text-xs self-end">{msg.timestamp}</span>
            </div>
          </motion.div>
        ))}

        {/* Payment Block - Scammer's payment request */}
        {paymentBlock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex justify-start mt-4"
          >
            <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-xl p-4 max-w-[70%] border border-red-600 shadow-xl">
              <div className="text-red-200 text-xs font-semibold mb-2 flex items-center gap-1">
                <span className="text-lg">🚨</span> Payment Required
              </div>
              
              <div className="bg-gray-900 rounded-lg p-3 mb-3">
                <p className="text-gray-300 text-xs mb-1">Amount to Send:</p>
                <p className="text-green-400 text-2xl font-bold">{paymentBlock.amount}</p>
              </div>

              {/* QR Button */}
              <div className="bg-gray-800 rounded-lg p-3 mb-3 border border-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-2 border-2 border-dashed border-gray-600">
                    <div className="text-2xl">📱</div>
                  </div>
                  <p className="text-gray-400 text-xs">Scan QR Code</p>
                </div>
              </div>

              {/* Payment Link */}
              <div className="mb-3">
                <p className="text-gray-300 text-xs mb-1">Or use link:</p>
                <code className="block bg-gray-800 p-2 rounded text-blue-400 text-xs break-all border border-blue-500/30">
                  {paymentBlock.link}
                </code>
              </div>

              {/* CTA Button */}
              <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl">
                {paymentBlock.cta}
              </button>
            </div>
          </motion.div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-3 py-2 rounded-lg flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Input area */}
      <div className="bg-gray-800 border-t border-purple-500/30 p-3 flex gap-2 items-center">
        <button className="text-gray-400 hover:text-gray-200 transition">📎</button>
        <input
          type="text"
          placeholder="Type a message..."
          disabled
          className="flex-1 bg-gray-700 text-gray-300 rounded-full px-4 py-2 text-sm placeholder-gray-500 outline-none disabled:opacity-50"
        />
        <button className="text-gray-400 hover:text-gray-200 transition">😊</button>
        <button className="text-gray-400 hover:text-gray-200 transition">🎤</button>
      </div>
    </div>
  )
}
