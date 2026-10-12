import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGroupsEnquiryPayload } from './groups-enquiry-server.ts';
import {
  composeGroupsEnquiryPhone,
  splitGroupsEnquiryPhone,
} from './groups-enquiry-validation.ts';

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
    phone: '0797658991',
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
    phone: '0797658991',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_email');
});

test('validateGroupsEnquiryPayload accepts national mobile phone', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: '0797658991',
  });
  assert.equal(result.ok, true);
});

test('composeGroupsEnquiryPhone prefixes Safari autofill national numbers with the picked code', () => {
  assert.equal(composeGroupsEnquiryPhone('+41', '\u2068797658991\u2069'), '+41 797658991');
  assert.equal(composeGroupsEnquiryPhone('+41', '079 765 89 91'), '+41 79 765 89 91');
  assert.equal(composeGroupsEnquiryPhone('+49', '15115570960'), '+49 15115570960');
  assert.equal(composeGroupsEnquiryPhone('+61', '412345678'), '+61 412345678');
  assert.equal(composeGroupsEnquiryPhone('+39', '06 1234 5678'), '+39 06 1234 5678');
});

test('composeGroupsEnquiryPhone keeps an explicit international number over the picker', () => {
  assert.equal(composeGroupsEnquiryPhone('+41', '+61 412 345 678'), '+61 412 345 678');
  assert.equal(composeGroupsEnquiryPhone('+41', '0049 151 15570960'), '+49 151 15570960');
  assert.equal(composeGroupsEnquiryPhone('+41', '+7 912 345 67 89'), '+7 912 345 67 89');
});

test('splitGroupsEnquiryPhone moves a known country code into the picker', () => {
  assert.deepEqual(splitGroupsEnquiryPhone('+49 151 15570960'), { code: '+49', national: '151 15570960' });
  assert.deepEqual(splitGroupsEnquiryPhone('+41797658991'), { code: '+41', national: '797658991' });
  assert.deepEqual(splitGroupsEnquiryPhone('+423 234 56 78'), { code: '+423', national: '234 56 78' });
  assert.deepEqual(splitGroupsEnquiryPhone('+1 (415) 555-0123'), { code: '+1', national: '(415) 555-0123' });
  assert.equal(splitGroupsEnquiryPhone('+7 912 345 67 89'), null);
  assert.equal(splitGroupsEnquiryPhone('079 765 89 91'), null);
});

test('validateGroupsEnquiryPayload accepts composed foreign phones', () => {
  for (const phone of ['+49 15115570960', '+61 412345678', '+41 797658991']) {
    const result = validateGroupsEnquiryPayload({
      locale: 'de',
      venue: 'restaurant',
      date: '2026-10-15',
      time: '12:00',
      groupSize: '12',
      name: 'Test',
      email: 'guest@example.com',
      phone,
    });
    assert.equal(result.ok, true, phone);
  }
});

test('validateGroupsEnquiryPayload accepts US +1 autofill-style phone', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: '+1 (415) 555-0123',
  });
  assert.equal(result.ok, true);
});

test('validateGroupsEnquiryPayload accepts tel URI paste', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: 'tel:+41791234567',
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.values.phone, '+41791234567');
});

test('validateGroupsEnquiryPayload accepts international phone with spaces', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: '+41 79 765 89 91',
  });
  assert.equal(result.ok, true);
});

test('validateGroupsEnquiryPayload rejects invalid phone', () => {
  const result = validateGroupsEnquiryPayload({
    locale: 'de',
    venue: 'restaurant',
    date: '2026-10-15',
    time: '12:00',
    groupSize: '12',
    name: 'Test',
    email: 'guest@example.com',
    phone: '12345',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_phone');
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
    phone: '0797658991',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, 'invalid_group_size');
});
