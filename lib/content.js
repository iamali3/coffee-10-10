'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const GROUPS = ['hookah', 'cold', 'hot', 'milkshake'];
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function string(value, max, name, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`Check ${name}.`);
  return value.trim();
}
function id(value) { if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value)) fail('Invalid item or category ID.'); return value; }
function image(value) {
  if (typeof value !== 'string' || !/^(assets\/menu-products\/[a-z0-9-]+\.(jpg|png|webp)|api\/photo\?id=[a-f0-9-]{36})$/.test(value)) fail('Choose an existing photo or upload a new one.');
  return value;
}
function validateContent(input) {
  if (!input || !Array.isArray(input.items) || !Array.isArray(input.categories)) fail('Invalid menu.');
  if (input.items.length > 500 || input.categories.length < 1 || input.categories.length > 50) fail('Menu limit exceeded.');
  const catIds = new Set(), itemIds = new Set();
  const categories = input.categories.map(c => {
    const key = id(c.id); if (catIds.has(key) || !GROUPS.includes(c.group)) fail('Invalid or duplicate category.'); catIds.add(key);
    return { id: key, ar: string(c.ar, 100, 'Arabic category name', true), en: string(c.en, 100, 'English category name', true), group: c.group };
  });
  const items = input.items.map(p => {
    const key = id(p.id); if (itemIds.has(key) || !catIds.has(p.cat)) fail('Duplicate product or missing category.'); itemIds.add(key);
    if (!Number.isSafeInteger(p.price) || p.price < 0 || p.price > 10000000) fail('Enter a valid whole-number IQD price.');
    if (!['', 'best', 'signature'].includes(p.badge || '')) fail('Invalid badge.');
    return { id: key, cat: p.cat, ar: string(p.ar, 160, 'Arabic product name', true), en: string(p.en, 160, 'English product name', true), price: p.price, image: image(p.image), badge: p.badge || '', aliases: string(p.aliases || '', 500, 'search keywords'), descriptionAr: string(p.descriptionAr || '', 1200, 'Arabic description'), descriptionEn: string(p.descriptionEn || '', 1200, 'English description'), hidden: p.hidden === true, soldOut: p.soldOut === true };
  });
  const settings = { whatsapp: string(input.settings?.whatsapp || '', 30, 'WhatsApp number'), socialLinks: {}, content: { ar: {}, en: {} } };
  if (settings.whatsapp && !/^\+?[0-9 ()-]{7,30}$/.test(settings.whatsapp)) fail('Use an international WhatsApp number.');
  for (const key of ['Instagram', 'Facebook', 'TikTok', 'Google Maps']) {
    const value = string(input.settings?.socialLinks?.[key] || '', 1000, key);
    if (value) { let url; try { url = new URL(value); } catch { fail(`Check the ${key} link.`); } if (url.protocol !== 'https:' || url.username || url.password) fail(`Use an HTTPS ${key} link.`); }
    settings.socialLinks[key] = value;
  }
  const fields = ['its1010','heroTitle','heroDesc','signatures','signaturesDesc','portalTitle','portalSub','findUs','contactLead','floor','basra','hoursHero','hoursNote','hoursValue','momentTitle','momentText','linksNote'];
  for (const lang of ['ar','en']) for (const key of fields) settings.content[lang][key] = string(input.settings?.content?.[lang]?.[key] || '', 1600, `${lang} ${key}`);
  return { schemaVersion: 1, categories, items, settings };
}
function seed() { return validateContent(JSON.parse(readFileSync(join(__dirname, '../data/menu.json'), 'utf8'))); }
function publicContent(content) {
  return { ...content, items: content.items.filter(p => !p.hidden).map(({ hidden, ...p }) => p) };
}
module.exports = { validateContent, publicContent, seed, fail, GROUPS };
