"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useFinances } from "@/hooks/use-finances";
import { categories, Category, Expense, PlannedPurchase } from "@/lib/types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return monthKey(next);
}

function labelMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  const value = monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    wallet: <><path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h2"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    arrowUp: <><path d="m18 15-6-6-6 6"/><path d="M12 9v10"/></>,
    cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.7L21 7H6"/></>,
    pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    cloud: <><path d="M17.5 19H7a5 5 0 1 1 1.3-9.8A7 7 0 0 1 21 13a4 4 0 0 1-3.5 6Z"/><path d="m9 14 2 2 4-4"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        <span className="eyebrow">ORGANIZZE</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

function CategorySelect({ defaultValue = "Outros" }: { defaultValue?: Category }) {
  return (
    <label>Categoria
      <select name="category" defaultValue={defaultValue}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
    </label>
  );
}

export type OrganizzeView = "overview" | "expenses" | "planning";

export function OrganizzeApp({ view = "overview" }: { view?: OrganizzeView }) {
  const reduceMotion = useReducedMotion();
  const [month, setMonth] = useState(monthKey());
  const [modal, setModal] = useState<"salary" | "expense" | "planned" | null>(null);
  const [expenseSort, setExpenseSort] = useState<"recent" | "highest" | "lowest">("recent");
  const [expenseCategory, setExpenseCategory] = useState<Category | "Todas">("Todas");
  const { data, update, loading, cloudEnabled, user, authReady, authError, signInWithGoogle, signOut } = useFinances(month);

  const spent = useMemo(() => data.expenses.reduce((total, item) => total + item.amount, 0), [data.expenses]);
  const planned = useMemo(() => data.planned.reduce((total, item) => total + item.amount, 0), [data.planned]);
  const available = data.salary - spent - planned;
  const committedPercent = data.salary > 0 ? Math.min(((spent + planned) / data.salary) * 100, 100) : 0;
  const spentPercent = data.salary > 0 ? Math.min((spent / data.salary) * 100, 100) : 0;
  const expensesByCategory = useMemo(() => categories
    .map((category) => ({
      category,
      total: data.expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total), [data.expenses]);
  const visibleExpenses = useMemo(() => {
    const filtered = expenseCategory === "Todas"
      ? [...data.expenses]
      : data.expenses.filter((item) => item.category === expenseCategory);

    return filtered.sort((a, b) => {
      if (expenseSort === "highest") return b.amount - a.amount;
      if (expenseSort === "lowest") return a.amount - b.amount;
      return b.date.localeCompare(a.date);
    });
  }, [data.expenses, expenseCategory, expenseSort]);
  const pageHeading = {
    overview: { eyebrow: "PAINEL FINANCEIRO", title: "Olá, vamos organizar?", description: "Seu dinheiro fica mais leve quando cada real tem um lugar." },
    expenses: { eyebrow: "MEUS GASTOS", title: "Tudo o que saiu, em um só lugar", description: "Acompanhe cada gasto do mês e mantenha seu saldo sob controle." },
    planning: { eyebrow: "PLANEJAMENTO", title: "Planeje antes de comprar", description: "Reserve o valor das próximas compras e veja o impacto no seu salário." },
  }[view];

  function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update((current) => ({ ...current, salary: Number(form.get("salary")) || 0 }));
    setModal(null);
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense: Expense = {
      id: crypto.randomUUID(),
      description: String(form.get("description")),
      amount: Number(form.get("amount")),
      category: form.get("category") as Category,
      date: String(form.get("date")),
    };
    update((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    setModal(null);
  }

  function addPlanned(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item: PlannedPurchase = {
      id: crypto.randomUUID(),
      description: String(form.get("description")),
      amount: Number(form.get("amount")),
      category: form.get("category") as Category,
      purchased: false,
    };
    update((current) => ({ ...current, planned: [item, ...current.planned] }));
    setModal(null);
  }

  function makePurchase(item: PlannedPurchase) {
    const expense: Expense = { id: crypto.randomUUID(), description: item.description, amount: item.amount, category: item.category, date: new Date().toISOString().slice(0, 10) };
    update((current) => ({ ...current, planned: current.planned.filter((entry) => entry.id !== item.id), expenses: [expense, ...current.expenses] }));
  }

  const userName = user?.displayName?.split(" ")[0] || "Você";
  const initials = user?.displayName
    ? user.displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "VO";

  if (cloudEnabled && (!authReady || !user || user.isAnonymous)) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><i/><i/><i/></span><span>organizze</span></div><div className="auth-orbit"><span>{money.format(2450)}</span><small>seu saldo, no seu ritmo</small></div></div>
          <div className="auth-content">
            <span className="eyebrow">BEM-VINDO AO ORGANIZZE</span>
            <h1>Suas finanças.<br/>Mais simples, mais suas.</h1>
            <p>Entre para manter salário, gastos e planos protegidos e sincronizados.</p>
            {!authReady ? <div className="auth-loading">Preparando seu espaço...</div> : <button className="google-button" onClick={signInWithGoogle}><GoogleMark/>Continuar com Google</button>}
            {authError && <p className="auth-error">{authError}</p>}
            <small className="auth-privacy">O Organizze acessa apenas seu nome, e-mail e foto de perfil para identificar sua conta.</small>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i/><i/><i/></span><span>organizze</span></div>
        <nav>
          <Link className={view === "overview" ? "active" : ""} href="/"><Icon name="grid"/>Visão geral</Link>
          <Link className={view === "expenses" ? "active" : ""} href="/gastos"><Icon name="wallet"/>Meus gastos</Link>
          <Link className={view === "planning" ? "active" : ""} href="/planejamento"><Icon name="target"/>Planejamento</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="small-note"><span><Icon name="cloud" size={17}/>{cloudEnabled && user ? "Sincronizado" : "Salvo neste navegador"}</span><small>{cloudEnabled && user ? `Conta de ${userName}` : "Conecte o Firebase quando quiser"}</small></div>
          <a href="#config"><Icon name="settings"/>Configurações</a>
          <div className="profile"><span>{initials}</span><div><strong>{userName}</strong><small>{user?.email || "Modo local"}</small></div>{user && <button onClick={signOut} aria-label="Sair da conta" title="Sair"><Icon name="logout" size={17}/></button>}</div>
        </div>
      </aside>

      <motion.main
        initial={{ y: reduceMotion ? 0 : 7 }}
        animate={{ y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <header>
          <div><span className="eyebrow">{pageHeading.eyebrow}</span><h1>{pageHeading.title}</h1><p>{pageHeading.description}</p></div>
          <div className="month-picker"><button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><Icon name="chevronLeft"/></button><span>{labelMonth(month)}</span><button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês"><Icon name="chevronRight"/></button></div>
        </header>

        {!cloudEnabled && <div className="local-banner"><span>Modo local</span> Seus dados já estão sendo salvos neste dispositivo. Adicione as credenciais do Firebase para sincronizá-los na nuvem.</div>}

        <section className={`summary-grid ${view === "expenses" ? "expense-summary" : ""} ${loading ? "is-loading" : ""}`} id="inicio">
          {view !== "expenses" && <>
          <article className="summary-card salary-card">
            <div className="card-heading"><span className="card-icon lime"><Icon name="wallet"/></span><span>Salário do mês</span><button onClick={() => setModal("salary")} aria-label="Editar salário"><Icon name="pencil" size={17}/></button></div>
            <strong>{money.format(data.salary)}</strong><small>Entrada mensal registrada</small>
          </article>
          <article className="summary-card">
            <div className="card-heading"><span className="card-icon coral"><Icon name="arrowUp"/></span><span>Gastos realizados</span></div>
            <strong>{money.format(spent)}</strong><small>{data.expenses.length} {data.expenses.length === 1 ? "lançamento" : "lançamentos"}</small>
          </article>
          <article className="summary-card">
            <div className="card-heading"><span className="card-icon purple"><Icon name="cart"/></span><span>Compras planejadas</span></div>
            <strong>{money.format(planned)}</strong><small>{data.planned.length} {data.planned.length === 1 ? "item reservado" : "itens reservados"}</small>
          </article>
          </>}
          {view === "expenses" && <article className="summary-card expense-total-card">
            <div className="card-heading"><span className="card-icon coral"><Icon name="arrowUp"/></span><span>Gastos realizados</span><span className="summary-percentage">{Math.round(spentPercent)}% do salário</span></div>
            <strong>{money.format(spent)}</strong><small>{data.expenses.length} {data.expenses.length === 1 ? "lançamento no mês" : "lançamentos no mês"}</small>
          </article>}
          <article className={`summary-card available-card ${available < 0 ? "negative" : ""}`}>
            <div className="card-heading"><span>Saldo livre</span><span className="live-dot">AGORA</span></div>
            <strong>{money.format(available)}</strong><small>Depois dos gastos e planos</small>
          </article>
        </section>

        <section className={`content-grid ${view === "expenses" ? "expense-content" : view !== "overview" ? "focused-content" : ""}`}>
          {view === "overview" && <>
          <article className="panel overview-panel">
            <div className="panel-heading"><div><span className="eyebrow">RESUMO</span><h2>Visão do mês</h2></div><span className="status-pill">{committedPercent <= 70 ? "No caminho certo" : committedPercent <= 90 ? "Atenção ao limite" : "Orçamento apertado"}</span></div>
            <div className="overview-body">
              <div className="donut" style={{ "--progress": `${committedPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(committedPercent)}%</strong><span>comprometido</span></div></div>
              <div className="breakdown">
                <div><span><i className="dot spent"/>Gastos realizados</span><strong>{money.format(spent)}</strong></div>
                <div><span><i className="dot planned"/>Compras planejadas</span><strong>{money.format(planned)}</strong></div>
                <div><span><i className="dot free"/>Saldo livre</span><strong>{money.format(Math.max(available, 0))}</strong></div>
              </div>
            </div>
            <div className="budget-track"><span style={{ width: `${spentPercent}%` }}/><i style={{ left: `${committedPercent}%` }}/></div>
            <p className="helper-text">{data.salary === 0 ? "Comece registrando seu salário para visualizar a distribuição do mês." : available >= 0 ? `Você ainda tem ${money.format(available)} livres para este mês.` : `Seu planejamento ultrapassou o salário em ${money.format(Math.abs(available))}.`}</p>
          </article>

          <article className="panel quick-panel">
            <span className="eyebrow">ATALHOS</span><h2>O que vamos anotar?</h2>
            <button className="quick-action" onClick={() => setModal("expense")}><span className="card-icon coral"><Icon name="plus"/></span><span><strong>Novo gasto</strong><small>Registre o que já saiu</small></span><Icon name="chevronRight"/></button>
            <button className="quick-action" onClick={() => setModal("planned")}><span className="card-icon purple"><Icon name="cart"/></span><span><strong>Planejar compra</strong><small>Reserve antes de gastar</small></span><Icon name="chevronRight"/></button>
          </article>
          </>}

          {view === "expenses" && <>
          <article className="panel spending-panel">
            <div className="panel-heading"><div><span className="eyebrow">DISTRIBUIÇÃO</span><h2>Onde seu dinheiro foi</h2></div></div>
            <div className="spending-impact">
              <div className="donut expense-donut" style={{ "--progress": `${spentPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(spentPercent)}%</strong><span>do salário</span></div></div>
              <div><span>Você gastou</span><strong>{money.format(spent)}</strong><small>{data.salary > 0 ? `de ${money.format(data.salary)} recebidos` : "Cadastre seu salário para comparar"}</small></div>
            </div>
            {expensesByCategory.length === 0 ? <div className="chart-empty">As categorias aparecerão aqui quando você registrar um gasto.</div> : <div className="category-breakdown">
              {expensesByCategory.map((item) => {
                const categoryIndex = categories.indexOf(item.category);
                const percentage = spent > 0 ? (item.total / spent) * 100 : 0;
                return <div className="category-row" key={item.category}>
                  <div><span><i className={`category-dot category-color-${categoryIndex}`}/>{item.category}</span><strong>{money.format(item.total)}</strong></div>
                  <div className="category-track"><span className={`category-color-${categoryIndex}`} style={{ width: `${percentage}%` }}/></div>
                  <small>{Math.round(percentage)}% dos gastos</small>
                </div>;
              })}
            </div>}
            {expensesByCategory[0] && <div className="top-category"><span>Categoria com maior gasto</span><strong>{expensesByCategory[0].category}</strong><small>{money.format(expensesByCategory[0].total)}</small></div>}
          </article>

          <article className="panel list-panel focused-list expense-list-panel" id="gastos">
            <div className="panel-heading"><div><span className="eyebrow">MOVIMENTAÇÕES</span><h2>Todos os gastos</h2></div><button className="text-button" onClick={() => setModal("expense")}><Icon name="plus" size={17}/>Adicionar</button></div>
            {data.expenses.length > 0 && <div className="expense-filters">
              <label><span>Categoria</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as Category | "Todas")}><option value="Todas">Todas as categorias</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label><span>Ordenar por</span><select value={expenseSort} onChange={(event) => setExpenseSort(event.target.value as "recent" | "highest" | "lowest")}><option value="recent">Mais recentes</option><option value="highest">Maior valor</option><option value="lowest">Menor valor</option></select></label>
              <small>{visibleExpenses.length} {visibleExpenses.length === 1 ? "resultado" : "resultados"}</small>
            </div>}
            {data.expenses.length === 0 ? <Empty icon="wallet" title="Nenhum gasto por aqui" text="Quando você registrar uma saída, ela aparece nesta lista." action="Registrar primeiro gasto" onClick={() => setModal("expense")}/> :
              visibleExpenses.length === 0 ? <div className="filter-empty"><strong>Nenhum gasto nesta categoria</strong><span>Escolha outra categoria para visualizar os lançamentos.</span></div> :
              <div className="item-list">{visibleExpenses.map((item) => <div className="list-item" key={item.id}><span className={`category-icon cat-${categories.indexOf(item.category)}`}><Icon name="wallet" size={18}/></span><div><strong>{item.description}</strong><small>{item.category} · {shortDate.format(new Date(`${item.date}T00:00:00Z`))}</small></div><b>- {money.format(item.amount)}</b><button className="icon-button" aria-label="Excluir gasto" onClick={() => update((current) => ({ ...current, expenses: current.expenses.filter((entry) => entry.id !== item.id) }))}><Icon name="trash" size={17}/></button></div>)}</div>}
          </article>
          </>}

          {view === "planning" && <article className="panel list-panel focused-list" id="planejados">
            <div className="panel-heading"><div><span className="eyebrow">PRÓXIMAS COMPRAS</span><h2>Lista de desejos do mês</h2></div><button className="text-button" onClick={() => setModal("planned")}><Icon name="plus" size={17}/>Adicionar</button></div>
            {data.planned.length === 0 ? <Empty icon="target" title="Tudo livre por enquanto" text="Planeje uma compra para saber quanto sobrará antes de decidir." action="Planejar uma compra" onClick={() => setModal("planned")}/> :
              <div className="item-list">{data.planned.map((item) => <div className="list-item planned-item" key={item.id}><span className={`category-icon cat-${categories.indexOf(item.category)}`}><Icon name="cart" size={18}/></span><div><strong>{item.description}</strong><small>{item.category}</small></div><b>{money.format(item.amount)}</b><button className="buy-button" title="Marcar como comprado" onClick={() => makePurchase(item)}><Icon name="check" size={16}/><span>Comprei</span></button><button className="icon-button" aria-label="Excluir planejamento" onClick={() => update((current) => ({ ...current, planned: current.planned.filter((entry) => entry.id !== item.id) }))}><Icon name="trash" size={17}/></button></div>)}</div>}
          </article>
          }
        </section>
      </motion.main>

      <nav className="mobile-nav"><Link className={view === "overview" ? "active" : ""} href="/"><Icon name="grid"/><small>Resumo</small></Link><Link className={view === "expenses" ? "active" : ""} href="/gastos"><Icon name="wallet"/><small>Gastos</small></Link><button onClick={() => setModal(view === "planning" ? "planned" : "expense")}><Icon name="plus"/></button><Link className={view === "planning" ? "active" : ""} href="/planejamento"><Icon name="target"/><small>Planejar</small></Link></nav>

      {modal === "salary" && <Modal title="Qual é o seu salário?" subtitle="Este valor será usado como base apenas neste mês." onClose={() => setModal(null)}><form onSubmit={saveSalary}><label>Salário líquido<input name="salary" type="number" min="0" step="0.01" defaultValue={data.salary || ""} placeholder="R$ 0,00" autoFocus required/></label><button className="primary-button" type="submit">Salvar salário</button></form></Modal>}
      {modal === "expense" && <Modal title="Registrar novo gasto" subtitle="Anote agora para não precisar lembrar depois." onClose={() => setModal(null)}><form onSubmit={addExpense}><label>Descrição<input name="description" placeholder="Ex.: Mercado da semana" autoFocus required/></label><div className="form-row"><label>Valor<input name="amount" type="number" min="0.01" step="0.01" placeholder="R$ 0,00" required/></label><label>Data<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></label></div><CategorySelect/><button className="primary-button" type="submit">Adicionar gasto</button></form></Modal>}
      {modal === "planned" && <Modal title="Planejar uma compra" subtitle="Veja o impacto no salário antes de colocar no carrinho." onClose={() => setModal(null)}><form onSubmit={addPlanned}><label>O que você quer comprar?<input name="description" placeholder="Ex.: Fone de ouvido" autoFocus required/></label><label>Valor estimado<input name="amount" type="number" min="0.01" step="0.01" placeholder="R$ 0,00" required/></label><CategorySelect/><button className="primary-button" type="submit">Reservar no orçamento</button></form></Modal>}
    </div>
  );
}

export default function Home() {
  return <OrganizzeApp view="overview"/>;
}

function Empty({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span><Icon name={icon} size={25}/></span><strong>{title}</strong><p>{text}</p><button onClick={onClick}>{action}</button></div>;
}

function GoogleMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.7 4.7 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.9A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.7A6 6 0 0 1 6.1 12c0-.6.1-1.2.3-1.7v-3H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.9Z"/><path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.9A5.9 5.9 0 0 1 12 6.2Z"/></svg>;
}
