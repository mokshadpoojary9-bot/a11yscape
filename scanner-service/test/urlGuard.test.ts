import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isBlockedAddress,
  validateTargetUrl,
  type HostResolver,
} from '../src/utils/urlGuard.js'

const publicResolver: HostResolver = async () => [{ address: '93.184.216.34', family: 4 }]

test('accepts a public http(s) target and normalises it', async () => {
  const url = await validateTargetUrl('  https://Example.com/path?q=1  ', {
    resolver: publicResolver,
  })
  assert.equal(url.toString(), 'https://example.com/path?q=1')
  assert.equal(url.hostname, 'example.com')
})

test('accepts a public IP literal without DNS', async () => {
  const url = await validateTargetUrl('https://93.184.216.34/', { resolver: publicResolver })
  assert.equal(url.hostname, '93.184.216.34')
})

test('rejects loopback, private and reserved URLs', async () => {
  const blocked = [
    'http://localhost/',
    'http://sub.localhost/',
    'http://service.local/',
    'http://metadata.google.internal/',
    'http://127.0.0.1/',
    'http://127.255.255.254/',
    'http://10.0.0.1/',
    'http://172.16.4.2/',
    'http://192.168.1.1/',
    'http://169.254.169.254/',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://224.0.0.1/',
    'http://255.255.255.255/',
    'http://[::1]/',
    'http://[fc00::1]/',
    'http://[fd12:3456::1]/',
    'http://[fe80::1]/',
    'http://[ff02::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[2001:db8::1]/',
  ]
  for (const candidate of blocked) {
    await assert.rejects(
      validateTargetUrl(candidate, { resolver: publicResolver }),
      /Local, private and reserved|private or reserved/,
      candidate,
    )
  }
})

test('rejects non-http protocols, credentials and non-standard ports', async () => {
  await assert.rejects(validateTargetUrl('file:///etc/passwd'), /http and https/)
  await assert.rejects(validateTargetUrl('ftp://example.com'), /http and https/)
  await assert.rejects(
    validateTargetUrl('https://user:secret@example.com/', { resolver: publicResolver }),
    /credentials/,
  )
  await assert.rejects(
    validateTargetUrl('https://example.com:8443/', { resolver: publicResolver }),
    /standard web ports/,
  )
  await assert.rejects(
    validateTargetUrl('https://example.com:22/', { resolver: publicResolver }),
    /standard web ports/,
  )
  const standard = await validateTargetUrl('https://example.com:443/', { resolver: publicResolver })
  assert.equal(standard.port, '')
})

test('rejects hostnames that resolve to private addresses', async () => {
  const privateResolver: HostResolver = async () => [{ address: '10.10.10.10', family: 4 }]
  await assert.rejects(
    validateTargetUrl('https://intranet.example.com/', { resolver: privateResolver }),
    /resolves to a private or reserved/,
  )
})

test('rejects mixed public/private DNS answers and resolution failures', async () => {
  const mixedResolver: HostResolver = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '192.168.0.10', family: 4 },
  ]
  await assert.rejects(
    validateTargetUrl('https://rebind.example.com/', { resolver: mixedResolver }),
    /resolves to a private or reserved/,
  )
  await assert.rejects(
    validateTargetUrl('https://missing.example/', {
      resolver: async () => {
        throw new Error('ENOTFOUND')
      },
    }),
    /could not be resolved/,
  )
})

test('rejects malformed and empty input', async () => {
  await assert.rejects(validateTargetUrl('not a url'), /valid absolute URL/)
  await assert.rejects(validateTargetUrl(''), /valid absolute URL/)
  await assert.rejects(validateTargetUrl(42), /valid absolute URL/)
})

test('classifies individual addresses correctly', () => {
  assert.equal(isBlockedAddress('8.8.8.8'), false)
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false)
  assert.equal(isBlockedAddress('10.0.0.1'), true)
  assert.equal(isBlockedAddress('127.0.0.1'), true)
  assert.equal(isBlockedAddress('::ffff:192.168.1.1'), true)
  assert.equal(isBlockedAddress('not-an-ip'), true)
})
