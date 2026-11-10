import { useState, useEffect } from 'react';
import { Wind, ArrowRight, Moon, Sun, Eye, EyeOff, BedDouble, CalendarDays, LayoutDashboard } from 'lucide-react';
export function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('vl-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { return 'light'; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('vl-theme', theme); } catch {} }, [theme]);
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')];
}
export function Welcome({ enter, theme, toggleTheme }) {
  const [show, setShow] = useState(false);
  return <main className="welcome-page">
    <section className="welcome-story">
      <a className="welcome-brand" href="#"><Wind size={36}/><span>vento leste<small>POUSADA • GESTÃO</small></span></a>
      <div className="story-copy"><span className="eyebrow">O CUIDADO ESTÁ NOS DETALHES</span><h1>O acolhimento<br/>é a nossa essência.<br/><em>A tranquilidade,<br/>a sua rotina.</em></h1><p>Um espaço para organizar as estadias,<br/>cuidar de cada chegada e receber melhor.</p></div>
      <div className="story-footer"><span>POUSADA VENTO LESTE</span><span>Hospitalidade que inspira.</span></div>
      <div className="landscape" aria-hidden="true"><div/><div/><div/></div>
    </section>
    <section className="login-side">
      <button className="icon-button login-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>{theme === 'dark' ? <Sun/> : <Moon/>}</button>
      <div className="login-content"><span className="login-symbol"><Wind size={28}/></span><span className="eyebrow">BEM-VINDO À SUA POUSADA</span><h2>Bom ter você aqui.</h2><p className="login-intro">Tudo pronto para mais um dia de boas estadias?</p>
      <form onSubmit={e => { e.preventDefault(); enter(); }} className="login-form">
        <label>E-mail<input type="email" autoComplete="username" placeholder="seu@email.com" required/></label>
        <label>Senha<div className="password-field"><input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Digite sua senha" required/><button type="button" className="icon-button" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <div className="demo-note"><strong>Acesso demonstrativo</strong><span>Use qualquer e-mail válido e senha para conhecer o painel. Esta versão não autentica usuários.</span></div>
        <button className="btn login-submit">Entrar no painel <ArrowRight size={19}/></button>
      </form>
      <div className="login-features"><span><BedDouble size={17}/> Quartos</span><span><CalendarDays size={17}/> Reservas</span><span><LayoutDashboard size={17}/> Gestão</span></div>
      </div><p className="login-footer">Mais organização. Mais tempo para acolher.</p>
    </section>
  </main>;
}
