import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, occupiedCount } from '../src/metrics.mjs';
test('datas civis atravessam meses e anos', () => { assert.equal(addDays('2026-12-31',1),'2027-01-01'); assert.equal(addDays('2028-02-28',1),'2028-02-29'); });
test('ocupação sem inventário ou reservas', () => { assert.equal(occupiedCount([],[],'2026-11-07'),0); assert.equal(occupiedCount([{id:1}],[],'2026-11-07'),0); });
test('saída e entrada no mesmo dia ocupam uma única noite por quarto', () => { const rooms=[{id:1}]; const reservations=[{quartoId:1,entrada:'2026-11-01',saida:'2026-11-07'},{quartoId:1,entrada:'2026-11-07',saida:'2026-11-10'}]; assert.equal(occupiedCount(rooms,reservations,'2026-11-07'),1); assert.equal(occupiedCount(rooms,reservations,'2026-11-10'),0); });
test('reserva que atravessa período e edição de saída alteram as noites previstas', () => { const rooms=[{id:1}]; const r={quartoId:1,entrada:'2026-10-30',saida:'2026-11-10'}; assert.equal(occupiedCount(rooms,[r],'2026-11-07'),1); assert.equal(occupiedCount(rooms,[{...r,saida:'2026-11-07'}],'2026-11-07'),0); });
