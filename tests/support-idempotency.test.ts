import { describe, expect, it } from 'vitest';
import { PendingClientMessageId, supportPayloadFingerprint } from '@/shared/lib/pending-client-message-id';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('support idempotency ids', () => {
  it('keeps the UUID for an unchanged retry and replaces it after editing', () => {
    const pending = new PendingClientMessageId();
    const original = supportPayloadFingerprint({ content: 'Necesito ayuda' });
    const edited = supportPayloadFingerprint({ content: 'Necesito ayuda con mi orden' });
    const first = pending.acquire(original);

    expect(first).toMatch(uuidPattern);
    expect(pending.acquire(original)).toBe(first);
    expect(pending.acquire(edited)).not.toBe(first);
  });

  it('retires a completed UUID so a later identical action is a new request', () => {
    const pending = new PendingClientMessageId();
    const payload = supportPayloadFingerprint({ subject: 'Consulta', message: 'Hola' });
    const completed = pending.acquire(payload);
    pending.complete(completed);
    expect(pending.acquire(payload)).not.toBe(completed);
  });
});

