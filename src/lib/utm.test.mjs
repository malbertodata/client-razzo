import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGroupsEnquiryUtmChannelLabel } from './utm.ts';

test('formatGroupsEnquiryUtmChannelLabel maps known utm_content values', () => {
  assert.equal(
    formatGroupsEnquiryUtmChannelLabel({ content: 'firmenfeier', source: '', medium: '', campaign: '' }),
    'Firmenfeier (Brief)',
  );
  assert.equal(
    formatGroupsEnquiryUtmChannelLabel({ content: 'vereinsfeier', source: '', medium: '', campaign: '' }),
    'Vereinsfeier (Brief)',
  );
  assert.equal(
    formatGroupsEnquiryUtmChannelLabel({ content: 'praxisfeier', source: '', medium: '', campaign: '' }),
    'Praxisfeier (Brief)',
  );
  assert.equal(
    formatGroupsEnquiryUtmChannelLabel({ content: 'fondue chalet', source: '', medium: '', campaign: '' }),
    'Fondue-Chalet-Poster (QR)',
  );
  assert.equal(
    formatGroupsEnquiryUtmChannelLabel({ content: 'poster', source: 'poster', medium: 'qr', campaign: '' }),
    null,
  );
});
