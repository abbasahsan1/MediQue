import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from './stateMachine.js';

test('allows valid transitions only', () => {
  assert.equal(canTransition('SCANNED', 'WAITING'), true);
  assert.equal(canTransition('SCANNED', 'URGENT'), true);
  assert.equal(canTransition('WAITING', 'URGENT'), true);
  assert.equal(canTransition('WAITING', 'CALLED'), true);
  assert.equal(canTransition('URGENT', 'CALLED'), true);
  assert.equal(canTransition('CALLED', 'IN_CONSULTATION'), true);
  assert.equal(canTransition('CALLED', 'NO_SHOW'), true);
  assert.equal(canTransition('IN_CONSULTATION', 'COMPLETED'), true);
});

test('rejects invalid transitions', () => {
  assert.equal(canTransition('WAITING', 'COMPLETED'), false);
  assert.equal(canTransition('NO_SHOW', 'WAITING'), false);
  assert.equal(canTransition('COMPLETED', 'WAITING'), false);
});
