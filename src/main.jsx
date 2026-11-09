import { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { Wind, LayoutDashboard, BedDouble, CalendarDays, Sun, Moon, LogOut, Menu, Plus, Search } from 'lucide-react';
import { Welcome, useTheme } from './welcome.jsx';
import { Occupancy } from './occupancy.jsx';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value) => value.split('-').reverse().join('/');
const statuses = ['Disponível', 'Ocupado', 'Manutenção'];
const pages = {
  dashboard: [LayoutDashboard, 'Dashboard', 'VISÃO GERAL', 'Bem-vindo ao painel de gestão da pousada.'],
  quartos: [BedDouble, 'Quartos', 'ACOMODAÇÕES', 'Consulte e gerencie os quartos da pousada.'],
  reservas: [CalendarDays, 'Reservas', 'HOSPEDAGENS', 'Gerencie as reservas e os dados dos hóspedes.']
};

async function api(resource, method = 'GET', data) {
  const response = await fetch('/api/' + resource, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.erro || 'Não foi possível concluir a operação.');
  return result;
}

function Table({ columns, rows, empty }) {
  return (
    <div className="table-wrap" tabIndex="0" role="region" aria-label="Tabela de registros. Em telas pequenas, role horizontalmente para ver todas as colunas.">
      <table>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map(({ id, cells }) => (
            <tr key={id}>{cells.map((cell, index) => <td key={columns[index]}>{cell}</td>)}</tr>
          )) : <tr><td className="empty" colSpan={columns.length}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ status }) {
  const style = { Ocupado: 'busy', Manutenção: 'maintenance' }[status] || '';
  return <span className={'status ' + style}>{status}</span>;
}

function Editor({ entity, record, rooms, close, save }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = dialogRef.current;
    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), input, select, textarea')];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { dialog.removeEventListener('keydown', trap); trigger?.focus(); };
  }, []);
  const isRoom = entity === 'quartos';
  const [form, setForm] = useState(record || (isRoom
    ? { status: 'Disponível' }
    : { hospedes: 1 }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = isRoom
    ? (record ? 'Editar quarto' : 'Cadastrar quarto')
    : (record ? 'Editar reserva' : 'Nova reserva');
  const nights = (Date.parse(form.saida) - Date.parse(form.entrada)) / 86400000;
  const total = nights > 0 && form.valorDiaria !== '' && form.valorDiaria != null
    ? money.format(nights * Number(form.valorDiaria))
    : '';
  const bind = (name) => ({
    value: form[name] ?? '',
    onChange: ({ target }) => setForm({ ...form, [name]: target.value })
  });

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await save(entity, form);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop open" onClick={(event) => {
      if (event.target === event.currentTarget && !busy) close();
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && !busy) close();
    }}>
      <form ref={dialogRef} className={'modal' + (isRoom ? '' : ' wide')} role="dialog" aria-modal="true"
        aria-labelledby="editor-title" onSubmit={submit}>
        <div className="modal-head">
          <div><span className="eyebrow">{pages[entity][2]}</span><h2 id="editor-title">{title}</h2></div>
          <button type="button" className="close" aria-label="Fechar" disabled={busy} onClick={close}>×</button>
        </div>
        {isRoom ? (
          <div className="form-grid">
            <label>Número do quarto<input autoFocus required {...bind('nome')} placeholder="Ex.: Quarto 01" /></label>
            <label>Capacidade máxima<input required type="number" min="1" step="1" {...bind('capacidade')} /></label>
            <label>Valor da diária (R$)<input required type="number" min="0.01" step="0.01" {...bind('preco')} /></label>
            <label>Situação atual<select {...bind('status')}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="full">Descrição<textarea rows="3" {...bind('descricao')} /></label>
          </div>
        ) : (
          <div className="form-grid">
            <label>Nome completo do hóspede<input autoFocus required {...bind('hospede')} /></label>
            <label>Telefone<input type="tel" {...bind('telefone')} /></label>
            <label>Quarto
              <select required value={form.quartoId ?? ''} onChange={({ target }) => {
                const room = rooms.find((item) => item.id === Number(target.value));
                setForm({ ...form, quartoId: target.value, valorDiaria: room?.preco ?? '' });
              }}>
                <option value="">Selecione o quarto</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.nome} — {room.capacidade} pessoas</option>)}
              </select>
            </label>
            <label>Quantidade de hóspedes<input required type="number" min="1" step="1" {...bind('hospedes')} /></label>
            <label>Data de entrada<input required type="date" {...bind('entrada')} /></label>
            <label>Data de saída<input required type="date" {...bind('saida')} /></label>
            <label>Valor da diária (R$)<input required type="number" min="0" step="0.01" {...bind('valorDiaria')} /></label>
            <label>Valor total<input readOnly value={total} /></label>
            <label className="full">Observações<textarea rows="3" {...bind('observacoes')} /></label>
          </div>
        )}
        {!isRoom && <p className="form-hint">O sistema verifica a disponibilidade e a capacidade do quarto.</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" className="btn light" disabled={busy} onClick={close}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [entered, setEntered] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('dashboard');
  const [menu, setMenu] = useState(false);
  const [data, setData] = useState({ quartos: [], reservas: [] });
  const [roomStatusFilter, setRoomStatusFilter] = useState('Todos');
  const [reservationRoomFilter, setReservationRoomFilter] = useState('');
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { quartos: rooms, reservas: reservations } = data;

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [quartos, reservas] = await Promise.all([api('quartos'), api('reservas')]);
      setData({ quartos, reservas });
    } catch (error) {
      setLoadError(error.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (entered) load(); }, [entered]);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  function navigate(nextPage) {
    setSearch('');
    setPage(nextPage);
    setMenu(false);
  }

  async function save(entity, form) {
    await api(form.id ? entity + '/' + form.id : entity, form.id ? 'PUT' : 'POST', form);
    setEditor(null);
    setNotice({ text: 'Cadastro salvo.' });
    await load();
  }

  async function remove(entity, record) {
    const item = entity === 'quartos' ? 'o quarto ' + record.nome : 'a reserva de ' + record.hospede;
    if (!window.confirm('Deseja excluir ' + item + '?')) return;
    setDeleting(true);
    try {
      await api(entity + '/' + record.id, 'DELETE');
      if (entity === 'quartos' && Number(reservationRoomFilter) === record.id) setReservationRoomFilter('');
      setNotice({ text: 'Cadastro excluído.' });
      await load();
    } catch (error) {
      setNotice({ text: error.message, error: true });
    } finally {
      setDeleting(false);
    }
  }

  function actions(entity, record) {
    return (
      <div className="table-actions">
        <button onClick={() => setEditor({ entity, record })} disabled={deleting}>Editar</button>
        <button className="delete" onClick={() => remove(entity, record)} disabled={deleting}>Excluir</button>
      </div>
    );
  }

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const occupied = new Set(reservations.filter((r) => r.entrada <= today && r.saida > today).map((r) => r.quartoId));
  const roomStatus = (room) => occupied.has(room.id) ? 'Ocupado' : room.status;
  const roomName = (id) => rooms.find((room) => room.id === id)?.nome || '—';
  const visibleRooms = rooms.filter((room) => (roomStatusFilter === 'Todos' || roomStatus(room) === roomStatusFilter) && (room.nome + ' ' + (room.descricao || '')).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const visibleReservations = reservations.filter((r) => (!reservationRoomFilter || r.quartoId === Number(reservationRoomFilter)) && r.hospede.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const upcoming = reservations.filter((r) => r.entrada >= today).sort((a,b) => a.entrada.localeCompare(b.entrada)).slice(0, 5);
  const [, title, eyebrow, subtitle] = pages[page];

  if (!entered) return <Welcome enter={() => setEntered(true)} theme={theme} toggleTheme={toggleTheme} />;

  return (
    <>
      <header className="topbar">
        <button className="mobile-menu" aria-label="Alternar menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu size={20} /></button>
        <div className="brand-mark"><Wind size={22} /></div><strong>Pousada Vento Leste</strong><span className="top-caption">HOSPITALIDADE EM CADA DETALHE</span><div className="top-tools"><button className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>{theme === "dark" ? <Sun size={20}/> : <Moon size={20}/>}</button><span className="avatar">VL</span></div>
      </header>
      <div className="app-shell">
        <aside className={'sidebar' + (menu ? ' open' : '')}>
          <p className="side-label">MENU PRINCIPAL</p>
          {Object.entries(pages).map(([key, [Icon, label]]) => (
            <button key={key} className={'nav-link' + (page === key ? ' active' : '')}
              aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}>
              <Icon size={19} aria-hidden="true"/> {label}
            </button>
          ))}
          <div className="sidebar-note"><Wind size={26}/><p>Mais tempo para<br/>receber bem.</p><small>Seu dia a dia, mais leve.</small></div><button className="nav-link exit" onClick={() => { setEntered(false); setPage("dashboard"); }}><LogOut size={18}/> Sair do painel</button><div className="side-bottom"><span className="avatar">VL</span><div><strong>Pousada Vento Leste</strong><small>Administração</small></div></div>
        </aside>
        <main className="main">
          <section className="page active">
            <div className="page-heading">
              <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>
              {page !== 'dashboard' && (
                <button className="btn" onClick={() => setEditor({ entity: page })} disabled={deleting || (page === 'reservas' && !rooms.length)}>
                  <Plus size={17}/>{page === 'quartos' ? 'Cadastrar quarto' : 'Nova reserva'}
                </button>
              )}
            </div>
            {loading ? <div className="state-panel" role="status">Carregando os dados da pousada…</div> : loadError ? <div className="state-panel" role="alert"><h2>Não foi possível carregar os dados</h2><p>{loadError}</p><button className="btn" onClick={load}>Tentar novamente</button></div> : <>
            {page === 'dashboard' && <>
              <div className="welcome-banner"><div><span className="eyebrow">CUIDAR COMEÇA POR AQUI</span><h2>Boas estadias começam<br/>com uma gestão tranquila.</h2><p>Acompanhe sua pousada e prepare as próximas boas-vindas.</p><button className="btn" disabled={!rooms.length} onClick={() => setEditor({entity: 'reservas'})}><Plus size={17}/> Nova reserva</button></div><Wind className="banner-wind" aria-hidden="true"/></div>
              <div className="stats">
                {[
                  ['Total de quartos', rooms.length, 'Quartos cadastrados'],
                  ['Ocupação prevista', occupied.size, 'Quartos com reserva hoje'],
                  ['Em manutenção', rooms.filter((room) => room.status === 'Manutenção').length, 'Situação cadastrada'],
                  ['Reservas', reservations.length, 'Reservas cadastradas']
                ].map(([label, value, caption]) => <article key={label} className="stat"><span>{label}</span><strong>{value}</strong><small>{caption}</small></article>)}
              </div>
              <Occupancy rooms={rooms} reservations={reservations} today={today}/><div className="panel dashboard-panel">
                <div className="panel-heading">
                  <div><h2>Próximas chegadas</h2><p>Reservas com entrada a partir de hoje</p></div>
                  <button className="btn" onClick={() => navigate('reservas')}>Ver reservas</button>
                </div>
                <Table columns={['Hóspede', 'Quarto', 'Entrada', 'Saída', 'Situação']} empty="Nenhuma chegada prevista."
                  rows={upcoming.map((r) => ({ id: r.id, cells: [
                    r.hospede, roomName(r.quartoId), formatDate(r.entrada), formatDate(r.saida),
                    <Badge status={r.entrada === today ? 'Chegada hoje' : 'Prevista'} />
                  ] }))} />
              </div>
            </>}
            {page !== 'dashboard' && <label className="search-box"><Search size={18}/><input aria-label={page === 'quartos' ? 'Buscar quartos' : 'Buscar hóspede'} placeholder={page === 'quartos' ? 'Buscar por quarto ou descrição…' : 'Buscar pelo nome do hóspede…'} value={search} onChange={e => setSearch(e.target.value)}/></label>}
            {page === 'quartos' && <>
              <div className="toolbar">
                <div className="filters">
                  {['Todos', ...statuses].map((status) => (
                    <button key={status} className={'filter' + (status === roomStatusFilter ? ' active' : '')}
                      aria-pressed={status === roomStatusFilter} onClick={() => setRoomStatusFilter(status)}>{status}</button>
                  ))}
                </div>
                <span className="muted">{visibleRooms.length} quarto(s)</span>
              </div>
              <div className="panel table-panel">
                <Table columns={['Quarto', 'Capacidade', 'Diária', 'Situação', 'Descrição', 'Ações']} empty="Nenhum quarto encontrado."
                  rows={visibleRooms.map((room) => ({ id: room.id, cells: [
                    <strong className="room-number">{room.nome}</strong>, room.capacidade + ' pessoa(s)', money.format(room.preco),
                    <Badge status={roomStatus(room)} />, room.descricao || '—', actions('quartos', room)
                  ] }))} />
              </div>
            </>}
            {page === 'reservas' && <>
              <div className="toolbar">
                <label className="search-label">Filtrar por quarto
                  <select value={reservationRoomFilter} onChange={(event) => setReservationRoomFilter(event.target.value)}>
                    <option value="">Todos os quartos</option>
                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.nome}</option>)}
                  </select>
                </label>
                <span className="muted">{visibleReservations.length} reserva(s)</span>
              </div>
              {!rooms.length && <p className="form-hint">Cadastre um quarto para criar a primeira reserva.</p>}
              <div className="panel table-panel">
                <Table columns={['Hóspede', 'Quarto', 'Telefone', 'Check-in', 'Check-out', 'Hóspedes', 'Valor total', 'Ações']}
                  empty="Nenhuma reserva encontrada." rows={visibleReservations.map((r) => ({ id: r.id, cells: [
                    <strong className="room-number">{r.hospede}</strong>, roomName(r.quartoId), r.telefone || '—', formatDate(r.entrada),
                    formatDate(r.saida), r.hospedes, money.format(r.valorTotal), actions('reservas', r)
                  ] }))} />
              </div>
            </>}
            </>}
            <footer className="page-footer">POUSADA VENTO LESTE <span>Feito para acolher. Pensado para simplificar.</span></footer>
          </section>
        </main>
      </div>
      {editor && <Editor {...editor} rooms={rooms} save={save} close={() => setEditor(null)} />}
      {notice && <div id="notice" role={notice.error ? 'alert' : 'status'} className={notice.error ? 'error' : ''} style={{ display: 'block' }}>{notice.text}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
