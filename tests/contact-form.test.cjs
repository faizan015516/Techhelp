const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup(fetch, valid = true) {
  const button = { textContent: 'Request Support →', disabled: false };
  const message = { dataset: {}, style: {}, textContent: '' };
  const values = { name: 'Test Visitor', email: 'visitor@example.com', issue: 'Printer Support', message: 'Printer offline' };
  const form = {
    action: 'https://formspree.io/f/xwlvrqkl', values, attributes: {},
    querySelector: () => button, reportValidity: () => valid,
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(type, callback) { this.submit = callback; }
  };
  let abort;
  vm.runInNewContext(script, {
    document: { querySelectorAll: () => [], getElementById: id => id === 'supportForm' ? form : message },
    FormData: class { constructor(f) { this.entries = { ...f.values }; } },
    fetch, AbortController,
    setTimeout(callback) { abort = callback; return 1; }, clearTimeout() {}
  });
  return { form, button, message, abort: () => abort(), submit: () => form.submit({ preventDefault() {} }) };
}

test('native fallback and all four named required fields are configured', () => {
  assert.match(html, /id="supportForm" action="https:\/\/formspree.io\/f\/xwlvrqkl" method="POST"/);
  for (const name of ['name', 'email', 'issue', 'message']) {
    assert.match(html, new RegExp(`<(?:input|select|textarea)[^>]*id="${name}"[^>]*name="${name}"[^>]*required`));
  }
  assert.doesNotMatch(html, /Demo form|Demo request|Demo support/);
});

test('pending blocks duplicates; successful POST sends all details and restores button', async () => {
  let resolve, calls = 0, request;
  const ui = setup((url, options) => {
    calls++; request = { url, options };
    return new Promise(done => { resolve = done; });
  });
  const pending = ui.submit();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.message.dataset.state, 'pending');
  assert.equal(ui.form.attributes['aria-busy'], 'true');
  await ui.submit();
  assert.equal(calls, 1);
  assert.equal(request.url, ui.form.action);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Accept, 'application/json');
  assert.deepEqual(request.options.body.entries, ui.form.values);
  resolve({ ok: true });
  await pending;
  assert.equal(ui.message.dataset.state, 'success');
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.button.textContent, 'Request Support →');
  assert.equal(ui.form.attributes['aria-busy'], undefined);
});

test('HTTP failure preserves content and allows retry', async () => {
  let calls = 0;
  const ui = setup(async () => ({ ok: ++calls > 1 }));
  const original = { ...ui.form.values };
  await ui.submit();
  assert.equal(ui.message.dataset.state, 'error');
  assert.deepEqual(ui.form.values, original);
  assert.equal(ui.button.disabled, false);
  await ui.submit();
  assert.equal(ui.message.dataset.state, 'success');
});

test('network failure does not claim success or erase content', async () => {
  const ui = setup(async () => { throw new TypeError('Network failed'); });
  await ui.submit();
  assert.equal(ui.message.dataset.state, 'error');
  assert.match(ui.message.textContent, /could not confirm/);
  assert.equal(ui.form.values.message, 'Printer offline');
  assert.equal(ui.button.disabled, false);
});

test('timeout aborts request and restores retry state', async () => {
  const ui = setup((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const pending = ui.submit();
  ui.abort();
  await pending;
  assert.equal(ui.message.dataset.state, 'error');
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.form.values.name, 'Test Visitor');
});

test('invalid form does not send', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; }, false);
  await ui.submit();
  assert.equal(calls, 0);
  assert.equal(ui.button.disabled, false);
});
