'use strict';
const indexed = new WeakSet();

// Authenticated caller supplies the server-side user, never an ID from the URL.
module.exports = function partnerStats(db, user, url, clock = new Date()) {
  if (!user || !['rider', 'merchant'].includes(user.role)) {
    throw new Error('Partner account required');
  }
  if (!indexed.has(db)) {
    db.exec('CREATE INDEX IF NOT EXISTS partner_stats_events ON order_events(order_id, status, created_at)');
    indexed.add(db);
  }
  const period = ['day', 'week', 'month'].includes(url.searchParams.get('period'))
    ? url.searchParams.get('period') : 'day';
  const rawOffset = Number(url.searchParams.get('offset') || 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const shift = 7 * 3600000;
  const local = new Date(clock.getTime() + shift);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - shift;
  const week = day - ((local.getUTCDay() + 6) % 7) * 86400000;
  const month = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - shift;
  const boundaries = { day, week, month };
  const owner = user.role === 'rider' ? 'o.rider_id = ?' : "o.shop_id = ? AND o.kind = 'food'";
  const ownerId = user.role === 'rider' ? user.id : (user.shop_id || '');
  const value = user.role === 'rider' ? 'o.fee_satang' : 'o.goods_satang';
  const source = `WITH completed AS (
    SELECT o.id, o.pickup, o.dropoff, ${value} AS amount_satang,
      (SELECT MAX(e.created_at) FROM order_events e
       WHERE e.order_id = o.id AND e.status = 'done') AS completed_at
    FROM orders o WHERE ${owner} AND o.status = 'done'
  )`;
  const summary = {};
  for (const [key, start] of Object.entries(boundaries)) {
    summary[key] = db.prepare(source + `
      SELECT COUNT(*) AS count, COALESCE(SUM(amount_satang), 0) AS amount_satang
      FROM completed WHERE julianday(completed_at) >= julianday(?)
      AND julianday(completed_at) <= julianday(?)`).get(
        ownerId, new Date(start).toISOString(), clock.toISOString());
  }
  const history = db.prepare(source + `
    SELECT * FROM completed WHERE julianday(completed_at) >= julianday(?)
    AND julianday(completed_at) <= julianday(?)
    ORDER BY completed_at DESC, id DESC LIMIT 50 OFFSET ?`).all(
      ownerId, new Date(boundaries[period]).toISOString(), clock.toISOString(), offset);
  const undated = db.prepare(source + ' SELECT COUNT(*) AS count FROM completed WHERE julianday(completed_at) IS NULL')
    .get(ownerId).count;
  return { timezone: 'Asia/Bangkok', generated_at: clock.toISOString(), period,
    summary, history, undated_count: undated,
    next_offset: offset + history.length < summary[period].count ? offset + history.length : null };
};
