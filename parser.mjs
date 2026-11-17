// Запуск: node parser.mjs. Нужен Node.js 20 или новее.
import { load } from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const source = 'https://ufa.move.ru/ufa/arenda_kvartir/';
// Небольшая подборка выбрана вручную по фотографиям, данные собирает парсер.
const selectedIds = ['9297652251', '9297247735', '9298615757', '9297222795', '9297419921', '9298693087', '9298693092', '9298693108', '9298693109'];
const clean = text => text.replace(/\s+/g, ' ').trim();
const number = text => Number(text.replace(/[^\d.,]/g, '').replace(',', '.')) || null;

async function page(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Сайт вернул ошибку ${response.status}`);
  return load(await response.text());
}

try {
  const listings = [];
  await mkdir('dist/assets/photos', { recursive: true });
  for (const pageUrl of [source, source + '?page=2']) {
    const $ = await page(pageUrl);
    for (const element of $('.search-item.move-object')) {
      const card = $(element);
      const id = card.attr('data-id');
      if (!selectedIds.includes(id) || listings.some(item => item.id === id)) continue;
      const title = clean(card.find('.search-item__title-link').first().text());
      const href = card.find('.search-item__link-overlay').attr('href');
      if (!title || !href) continue;
      const address = clean(card.find('.geo-block__geo-info').text());
      const district = address.match(/(Дёмский|Калининский|Кировский|Ленинский|Октябрьский|Орджоникидзевский|Советский)/)?.[1] || null;
      const photos = [...new Set(card.find('img.search-item__image').map((i, img) => $(img).attr('src')).get())].map(url => new URL(url, source).href).slice(0, 4);
      const listing = {
        id: card.attr('data-id'), title, address, district,
        price: number(card.find('.search-item__price-first').first().text()),
        rooms: /студи/i.test(title) ? 0 : number(title.match(/^(\d+)\s*-/)?.[1] || ''),
        area: number(title.match(/([\d.,]+)\s*м/)?.[1] || ''),
        description: clean(card.find('.search-item__description').text()),
        photos, url: new URL(href, source).href
      };
      // На странице самого объявления находится полное описание.
      try {
        const detail = await page(listing.url);
        listing.description = clean(detail('.card-objects-description__description-text').text()) || listing.description;
      } catch (error) {
        console.warn(`Описание ${listing.id}: ${error.message}. Сохраняем данные карточки.`);
      }
      // Фото храним рядом с сайтом: внешние ссылки могут перестать работать.
      listing.photos = [];
      for (const [index, url] of photos.entries()) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
          const type = response.headers.get('content-type') || '';
          if (!response.ok || !type.startsWith('image/')) throw new Error('Фото недоступно');
          const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
          const path = `assets/photos/${id}-${index}.${extension}`;
          await writeFile(`dist/${path}`, Buffer.from(await response.arrayBuffer()));
          listing.photos.push(path);
        } catch { console.warn(`Фото ${id}-${index} пропущено`); }
      }
      listings.push(listing);
      console.log(`Получено: ${listings.length}. ${title}`);
    }
  }
  listings.sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
  if (!listings.length) throw new Error('Карточки не найдены. Возможно, сайт изменил разметку.');
  // Старый файл заменяем только после успешного получения объявлений.
  await writeFile('dist/listings.json', JSON.stringify({ source, updatedAt: new Date().toISOString(), listings }, null, 2));
  console.log('Готово: dist/listings.json');
} catch (error) {
  console.error(`Не удалось обновить объявления: ${error.message}. Старый файл сохранён.`);
  process.exitCode = 1;
}
