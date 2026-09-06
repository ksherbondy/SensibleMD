export interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settled: boolean
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  let settled = false
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = (value) => { settled = true; resolvePromise(value) }
    reject = (reason) => { settled = true; rejectPromise(reason) }
  })
  return { promise, resolve, reject, get settled() { return settled } }
}

export type ScheduledCallStatus = 'pending' | 'released' | 'abandoned'

export interface ScheduledCall {
  readonly id: number
  readonly channel: string
  readonly status: ScheduledCallStatus
}

interface InternalCall extends ScheduledCall {
  status: ScheduledCallStatus
  gate: Deferred<void>
}

/**
 * Controls the order in which asynchronous boundary calls resolve, so a test can
 * reproduce sequences such as "B resolves before A" or "the response never arrives".
 */
export class CallScheduler {
  private readonly calls: InternalCall[] = []
  private nextId = 1
  private manual = false

  /** Queue subsequent calls until they are explicitly released. */
  useManualOrder() {
    this.manual = true
  }

  /** Resolve everything currently queued and let later calls resolve on their own. */
  useAutomaticOrder() {
    this.manual = false
    this.releaseAll()
  }

  schedule<T>(channel: string, compute: () => T | Promise<T>): Promise<T> {
    if (!this.manual) return Promise.resolve().then(compute)
    const call: InternalCall = { id: this.nextId++, channel, status: 'pending', gate: deferred<void>() }
    this.calls.push(call)
    return call.gate.promise.then(compute)
  }

  pending(channel?: string): ScheduledCall[] {
    return this.calls
      .filter((call) => call.status === 'pending' && (channel === undefined || call.channel === channel))
      .map(({ id, channel: name, status }) => ({ id, channel: name, status }))
  }

  /** Release the oldest pending call, optionally restricted to one channel. */
  release(selector?: number | string): ScheduledCall {
    const call = this.locate(selector)
    call.status = 'released'
    call.gate.resolve()
    return { id: call.id, channel: call.channel, status: call.status }
  }

  /** Release the newest pending call, optionally restricted to one channel. */
  releaseLatest(channel?: string): ScheduledCall {
    const matching = this.calls.filter((call) => call.status === 'pending' && (channel === undefined || call.channel === channel))
    const call = matching.at(-1)
    if (!call) throw new Error(`No pending call to release${channel ? ` on channel "${channel}"` : ''}`)
    return this.release(call.id)
  }

  releaseAll() {
    for (const call of this.calls) {
      if (call.status !== 'pending') continue
      call.status = 'released'
      call.gate.resolve()
    }
  }

  /** Leave a call permanently unsettled, modelling a response that never arrives. */
  abandon(selector?: number | string): ScheduledCall {
    const call = this.locate(selector)
    call.status = 'abandoned'
    return { id: call.id, channel: call.channel, status: call.status }
  }

  private locate(selector?: number | string): InternalCall {
    const call = this.calls.find((candidate) => {
      if (candidate.status !== 'pending') return false
      if (typeof selector === 'number') return candidate.id === selector
      if (typeof selector === 'string') return candidate.channel === selector
      return true
    })
    if (!call) throw new Error(`No pending call matching ${selector === undefined ? 'any channel' : JSON.stringify(selector)}`)
    return call
  }
}
