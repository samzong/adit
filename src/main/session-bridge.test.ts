import { describe, expect, it, vi, beforeEach } from 'vitest'

const onHello = vi.fn()
const portClose = vi.fn()
const portStart = vi.fn()
const portRemoveAllListeners = vi.fn()
const postMessageToFrame = vi.fn()

let capturedChannel = ''
let capturedHandler: ((event: unknown, hello: unknown) => void) | null = null

vi.mock('electron', () => ({
  ipcMain: {
    on: (channel: string, handler: (event: unknown, hello: unknown) => void) => {
      capturedChannel = channel
      capturedHandler = handler
      onHello(channel, handler)
    }
  },
  MessageChannelMain: vi.fn().mockImplementation(() => ({
    port1: {
      on: vi.fn(),
      start: portStart,
      close: portClose,
      removeAllListeners: portRemoveAllListeners
    },
    port2: { id: 'port2' }
  }))
}))

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

import { SessionBridge } from './session-bridge'
import { providerBridgeHello, PROTOCOL_VERSION } from '../shared/provider-bridge-protocol'
import { providers } from './providers'

interface FakeFrame {
  url: string
  processId: number
  routingId: number
}
interface FakeEvent {
  sender: { id: number; mainFrame: FakeFrame }
  senderFrame: FakeFrame | null
}

function makeEvent(
  webContentsId: number,
  frameUrl: string,
  opts: { subframe?: boolean; aliasInstance?: boolean } = {}
): FakeEvent {
  const topFrame: FakeFrame = { url: frameUrl, processId: 1, routingId: 1 }
  if (opts.aliasInstance) {
    return {
      sender: { id: webContentsId, mainFrame: topFrame },
      senderFrame: { url: frameUrl, processId: 1, routingId: 1 }
    }
  }
  if (opts.subframe) {
    return {
      sender: { id: webContentsId, mainFrame: topFrame },
      senderFrame: { url: frameUrl, processId: 2, routingId: 1 }
    }
  }
  return {
    sender: { id: webContentsId, mainFrame: topFrame },
    senderFrame: topFrame
  }
}

function hello(runtimeId = 'rt-1') {
  return { protocolVersion: PROTOCOL_VERSION, runtimeId }
}

describe('SessionBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedHandler = null
  })

  it('registers a process-global handler once at construction', () => {
    new SessionBridge()
    expect(capturedChannel).toBe(providerBridgeHello)
    expect(onHello).toHaveBeenCalledTimes(1)
  })

  it('drops hello when no active context is attached', () => {
    const bridge = new SessionBridge()
    const handler = capturedHandler!
    handler(makeEvent(1, 'https://chatgpt.com/c/abc'), hello())
    expect(postMessageToFrame).not.toHaveBeenCalled()
    expect(() => bridge.detach()).not.toThrow()
  })

  it('establishes a connection for a valid adapter host hello', () => {
    const bridge = new SessionBridge()
    bridge.attach({
      provider: providers.chatgpt,
      webContentsId: 42,
      mode: 'active_ephemeral'
    })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      sender: { id: number; mainFrame: FakeFrame }
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame

    capturedHandler!(event, hello())
    expect(postMessageToFrame).toHaveBeenCalledTimes(1)
    const transfer = postMessageToFrame.mock.calls[0][2] as unknown[]
    expect(transfer).toHaveLength(1)
  })

  it('rejects hello whose sender is not the active view', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    capturedHandler!(makeEvent(999, 'https://chatgpt.com/c/abc'), hello())
    expect(postMessageToFrame).not.toHaveBeenCalled()
  })

  it('accepts a distinct WebFrameMain object for the same top frame', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc', { aliasInstance: true }) as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())
    expect(postMessageToFrame).toHaveBeenCalledTimes(1)
  })

  it('rejects hello from a subframe', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc', { subframe: true }) as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())
    expect(postMessageToFrame).not.toHaveBeenCalled()
  })

  it('rejects hello from an auth host even though it is in allowedHosts', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://auth.openai.com/log-in') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())
    expect(postMessageToFrame).not.toHaveBeenCalled()
  })

  it('derives host from frame.url, not from a smuggled payload origin', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    const lyingPayload = {
      protocolVersion: PROTOCOL_VERSION,
      runtimeId: 'rt-1',
      origin: 'https://evil.com',
      href: 'https://evil.com'
    }
    capturedHandler!(event, lyingPayload)
    expect(postMessageToFrame).toHaveBeenCalledTimes(1)
  })

  it('rejects hello when session mode is closing', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'closing' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())
    expect(postMessageToFrame).not.toHaveBeenCalled()
  })

  it('rejects malformed hello payload', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, { protocolVersion: 99, runtimeId: 'x' })
    expect(postMessageToFrame).not.toHaveBeenCalled()
  })

  it('detach closes an existing connection and clears context', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())
    expect(portStart).toHaveBeenCalled()

    bridge.detach()
    expect(portClose).toHaveBeenCalled()
    expect(portRemoveAllListeners).toHaveBeenCalled()
  })

  it('re-attaching replaces the prior connection', () => {
    const bridge = new SessionBridge()
    bridge.attach({ provider: providers.chatgpt, webContentsId: 42, mode: 'active_ephemeral' })
    const event = makeEvent(42, 'https://chatgpt.com/c/abc') as unknown as {
      senderFrame: FakeFrame & { postMessage: typeof postMessageToFrame }
    }
    event.senderFrame.postMessage = postMessageToFrame
    capturedHandler!(event, hello())

    bridge.attach({ provider: providers.grok, webContentsId: 7, mode: 'creating' })
    expect(portClose).toHaveBeenCalledTimes(1)
  })
})
