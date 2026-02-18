import test from 'node:test';
import assert from 'node:assert/strict';
import { signCheckinToken, signStaffToken, verifyCheckinToken, verifyStaffToken } from './security.js';

test('signed check-in token verifies for matching department', () => {
  const token = signCheckinToken('GM', Date.now() + 60_000, 'nonce-1');
  assert.equal(verifyCheckinToken(token, 'GM'), true);
  assert.equal(verifyCheckinToken(token, 'ENT'), false);
});

test('staff jwt roundtrip keeps claims', () => {
  const token = signStaffToken({ sub: 'doc-1', role: 'DOCTOR' });
  const claims = verifyStaffToken(token);
  assert.equal(claims.sub, 'doc-1');
  assert.equal(claims.role, 'DOCTOR');
});
