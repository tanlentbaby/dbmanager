import React, { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  nl2sqlOffline,
  explainSQLOffline,
  optimizeSQLOffline,
  chatOffline,
  createChatSession,
  AIChatSession,
} from '@/lib/aiAssistant'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

type AIMode = 'chat' | 'nl2sql' | 'explain' | 'optimize'

export default function AIAssistant() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [mode, setMode] = useState<AIMode>('chat')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState<AIChatSession | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化聊天会话
  useEffect(() => {
    if (mode === 'chat' && !session) {
      setSession(createChatSession())
    }
  }, [mode])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages])

  const handleAI = useMutation({
    mutationFn: async () => {
      setIsLoading(true)
      try {
        let response

        switch (mode) {
          case 'nl2sql':
            response = await nl2sqlOffline({ query: input })
            break
          case 'explain':
            response = await explainSQLOffline({ sql: input })
            break
          case 'optimize':
            response = await optimizeSQLOffline({ sql: input })
            break
          case 'chat':
            const sessionId = session?.id || createChatSession().id
            response = await chatOffline(sessionId, input)
            setSession(response)
            break
        }

        return response
      } finally {
        setIsLoading(false)
      }
    },
    onSuccess: (data) => {
      if (mode !== 'chat') {
        setResult(data)
      }
      setToast({ message: 'AI 处理完成', type: 'success' })
    },
    onError: (error: any) => {
      setToast({ message: `AI 处理失败：${error.message}`, type: 'error' })
    },
  })

  const handleSubmit = () => {
    if (!input.trim()) {
      setToast({ message: '请输入内容', type: 'error' })
      return
    }
    handleAI.mutate()
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setToast({ message: '已复制到剪贴板', type: 'success' })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold">AI 离线助手 🤖</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('chat')}
            className={`px-4 py-2 rounded ${
              mode === 'chat'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            💬 聊天
          </button>
          <button
            onClick={() => setMode('nl2sql')}
            className={`px-4 py-2 rounded ${
              mode === 'nl2sql'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            🔍 NL2SQL
          </button>
          <button
            onClick={() => setMode('explain')}
            className={`px-4 py-2 rounded ${
              mode === 'explain'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            📖 解释
          </button>
          <button
            onClick={() => setMode('optimize')}
            className={`px-4 py-2 rounded ${
              mode === 'optimize'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            ⚡ 优化
          </button>
        </div>
      </div>

      {/* 聊天模式 */}
      {mode === 'chat' && session && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-4xl mb-4">🤖</p>
                <p>我是 DBManager AI 助手</p>
                <p>可以帮您编写 SQL、解释 SQL、优化 SQL</p>
                <p className="text-sm mt-4">请输入您的问题开始对话</p>
              </div>
            )}

            {session.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="输入您的问题..."
                className="flex-1 input"
                disabled={isLoading}
              />
              <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
                {isLoading ? '思考中...' : '发送'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 其他模式 */}
      {mode !== 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 输入区域 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'nl2sql'
                  ? '例如：查询最近 7 天订单最多的前 10 个用户'
                  : mode === 'explain'
                  ? '粘贴 SQL 语句...'
                  : '粘贴要优化的 SQL 语句...'
              }
              className="w-full h-32 input font-mono text-sm"
              disabled={isLoading}
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
                {isLoading ? '处理中...' : '执行 AI'}
              </Button>
              {result && (
                <Button onClick={() => handleCopy(result.sql || result.optimizedSQL || '')} variant="secondary">
                  📋 复制
                </Button>
              )}
            </div>
          </div>

          {/* 结果区域 */}
          <div className="flex-1 overflow-y-auto p-4">
            {result && (
              <div className="space-y-4">
                {mode === 'nl2sql' && (
                  <>
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-2">生成的 SQL</h3>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                        <code className="font-mono text-sm">{result.sql}</code>
                      </pre>
                      <div className="mt-2 flex gap-4 text-sm text-gray-500">
                        <span>置信度：{(result.confidence * 100).toFixed(0)}%</span>
                        <span>表：{result.tables?.join(', ')}</span>
                      </div>
                    </div>
                    {result.explanation && (
                      <div className="card">
                        <h3 className="text-lg font-semibold mb-2">说明</h3>
                        <p className="text-gray-600 dark:text-gray-400">{result.explanation}</p>
                      </div>
                    )}
                  </>
                )}

                {mode === 'explain' && (
                  <>
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-2">SQL 解释</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">{result.summary}</p>
                      <h4 className="font-semibold mb-2">分解:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {result.breakdown.map((item: string, i: number) => (
                          <li key={i} className="text-gray-600 dark:text-gray-400">{item}</li>
                        ))}
                      </ul>
                    </div>
                    {result.suggestions.length > 0 && (
                      <div className="card">
                        <h3 className="text-lg font-semibold mb-2">建议</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {result.suggestions.map((suggestion: string, i: number) => (
                            <li key={i} className="text-gray-600 dark:text-gray-400">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {mode === 'optimize' && (
                  <>
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-2">优化后的 SQL</h3>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-x-auto">
                        <code className="font-mono text-sm">{result.optimizedSQL}</code>
                      </pre>
                    </div>
                    {result.improvements.length > 0 && (
                      <div className="card">
                        <h3 className="text-lg font-semibold mb-2">优化建议</h3>
                        <ul className="list-disc list-inside space-y-1">
                          {result.improvements.map((item: string, i: number) => (
                            <li key={i} className="text-gray-600 dark:text-gray-400">{item}</li>
                          ))}
                        </ul>
                        <p className="mt-4 text-green-600 font-semibold">{result.performanceGain}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!result && !isLoading && (
              <div className="text-center text-gray-500 mt-8">
                <p>输入内容后点击"执行 AI"查看结果</p>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
