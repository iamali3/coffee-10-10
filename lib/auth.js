'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { fail } = require('./content');
const scrypt = promisify(crypto.scrypt);
const COOKIE = 'coffee_owner';
function configured() { return !!(process.env.OWNER_PASSWORD_HASH && process.env.OWNER_SESSION_SECRET?.length >= 32); }
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
async function verifyPassword(password) {
  const [scheme, salt, hex] = (process.env.OWNER_PASSWORD_HASH || '').split(':');
  if (scheme !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hex || '') || typeof password !== 'string' || password.length > 256) return false;
  const expected = Buffer.from(hex, 'hex');
  return crypto.timingSafeEqual(expected, await scrypt(password, salt, 64));
}
function sign(value) { return crypto.createHmac('sha256', process.env.OWNER_SESSION_SECRET).update(value).digest('base64url'); }
function token() {
  const value = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 3600000, nonce: crypto.randomBytes(24).toString('hex'), credential: crypto.createHash('sha256').update(process.env.OWNER_PASSWORD_HASH).digest('hex') })).toString('base64url');
  return `${value}.${sign(value)}`;
}
function session(req) {
  if (!configured()) return null;
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!cookie) return null;
  const [value, signature] = cookie.split('.'); if (!value || !signature) return null;
  const expected = Buffer.from(sign(value)), actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try { const data = JSON.parse(Buffer.from(value, 'base64url')); return data.exp > Date.now() && data.credential === crypto.createHash('sha256').update(process.env.OWNER_PASSWORD_HASH).digest('hex') ? data : null; } catch { return null; }
}
function cookie(req, value, clear = false) { return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`; }
function requireSession(req) { const value = session(req); if (!value) fail('Please sign in again.', 401); return value; }
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || new URL(origin).host !== (req.headers['x-forwarded-host'] || req.headers.host)) fail('Request origin rejected.', 403);
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') fail('Expected JSON.', 415);
}
function requireMutation(req) {
  checkOrigin(req); const value = requireSession(req);
  if (req.headers['x-owner-csrf'] !== value.nonce) fail('Refresh this page and try again.', 403);
  return value;
}
module.exports = { configured, hashPassword, verifyPassword, token, session, cookie, requireSession, requireMutation, checkOrigin };
