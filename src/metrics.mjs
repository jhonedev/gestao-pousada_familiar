// Dates are civil ISO dates. UTC arithmetic avoids daylight-saving shifts.
export function addDays(date, days) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); }
// Count distinct registered rooms with arrival <= day and departure > day.
export function occupiedCount(rooms, reservations, day) { const ids = new Set(rooms.map(r => r.id)); return new Set(reservations.filter(r => ids.has(r.quartoId) && r.entrada <= day && r.saida > day).map(r => r.quartoId)).size; }
