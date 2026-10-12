import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGroupsEnquiryPayload } from './groups-enquiry-server.ts';

test('validateGroupsEnquiryPayload accepts a bookable chalet slot', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'chalet',
    date: '2026-11-05',
    time: '11:30',
    groupSize: '12',
    name: 'Test Gruppe',
    email: 'guest@example.com',
    phone: '+41 71 220 90 00',
    notes: '',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.values.groupSize, '12');
  }
});

test('validateGroupsEnquiryPayload rejects invalid time for date', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'chalet',
    date: '2026-11-05',
    time: '03:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: '123',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_time');
});

test('validateGroupsEnquiryPayload rejects incomplete email domain', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'markusalbert@me',
    phone: '123',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_email');
});

test('validateGroupsEnquiryPayload rejects group size below 9', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '8',
    name: 'Test',
    email: 'guest@example.com',
    phone: '123',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_group_size');
});
