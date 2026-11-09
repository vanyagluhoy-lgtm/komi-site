"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { COLORS } from "@/lib/leads";
import FurCanvas from "./FurCanvas";
import OrderForm from "./OrderForm";

const LINKS = [
  { href: "#colors", label: "Кольори" },
  { href: "#fabric", label: "Тканина" },
  { href: "#sizes", label: "Заміри" },
];

const TAGLINE = ["Одягаєш зранку.", "Знімати вже не хочеш."];

export default function Landing() {
  const [color, setColor] = useState<string>(COLORS[0].label);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [touched, setTouched] = useState(false);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const floodFrom = useRef<{ x: number; y: number } | null>(null);

  const current = COLORS.find((item) => item.label === color) ?? COLORS[0];

  const theme = useMemo(
    () =>
      ({
        "--bg": current.theme.bg,
        "--surface": current.theme.surface,
        "--surface-2": current.theme.surface2,
        "--line": current.theme.line,
        "--text": current.theme.text,
        "--muted": current.theme.muted,
        "--accent": current.theme.accent,
        "--accent-hover": current.theme.muted,
        "--on-accent": current.theme.onAccent,
        "--danger": current.theme.danger,
      }) as CSSProperties,
    [current],
  );

  const furColor = useMemo(() => ({ fur: current.fur, bg: current.theme.bg }), [current]);
  const fail = useCallback(() => setNoGl(true), []);
  const firstTouch = useCallback(() => setTouched(true), []);

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("pending");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    items.forEach((item) => {
      if (item.getBoundingClientRect().top > window.innerHeight) {
        item.classList.add("pending");
        observer.observe(item);
      }
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = Array.from(taglineRef.current?.querySelectorAll<HTMLElement>(".word") ?? []);
    let ticking = false;

    function update() {
      ticking = false;
      const tagline = taglineRef.current;
      if (!tagline) return;
      const viewport = window.innerHeight;
      const rect = tagline.getBoundingClientRect();
      const start = viewport * 0.85;
      const end = viewport * 0.5;
      const progress = reduced ? 1 : (start - rect.top) / (start - end + rect.height);
      const active = Math.floor(Math.min(Math.max(progress, 0), 1) * words.length);
      words.forEach((word, index) => {
        if (index < active) word.classList.add("on");
      });
    }

    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  function pickFromHero(event: MouseEvent<HTMLButtonElement>, label: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    floodFrom.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setColor(label);
  }

  let wordIndex = 0;

  return (
    <div className="site" style={theme}>
      <a className="skip-link button-sm" href="#main">Перейти до змісту</a>

      <header className="nav-wrap">
        <nav className="nav" aria-label="Головна навігація">
          <a className="logo title-3" href="#top">MAAAARKA</a>
          <ul className="nav-links body-5">
            {LINKS.map((link) => (
              <li key={link.href}><a href={link.href}>{link.label}</a></li>
            ))}
          </ul>
          <a className="btn btn-light button-sm nav-cta" href="#order">Замовити</a>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span /><span />
          </button>
        </nav>
      </header>

      <div className={`mobile-menu${menuOpen ? " open" : ""}`} inert={!menuOpen}>
        <ul className="heading-4">
          {[...LINKS, { href: "#order", label: "Замовити" }].map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>

      <main id="main">
        <section className={`hero${noGl ? " no-gl" : ""}`} id="top">
          {noGl ? (
            <div className="hero-fallback" aria-hidden="true">КОМІ</div>
          ) : (
            <FurCanvas color={furColor} panelRef={panelRef} floodFrom={floodFrom} onFail={fail} onFirstTouch={firstTouch} />
          )}

          {!noGl && (
            <p className={`hero-hint caption-3${touched ? " off" : ""}`}>Проведи по хутру курсором або пальцем</p>
          )}

          <div className="hero-panel" ref={panelRef}>
            <div className="hero-copy">
              <h1 className="heading-3 hero-title">
                Костюм із шерпи,<br />
                який хочеться гладити
              </h1>
              <p className="body-6 hero-sub">Оверсайз худі та широкі штани. Шерпа на флісі, один розмір, 5 кольорів.</p>
            </div>

            <div className="hero-actions">
              <div className="hero-colors" role="group" aria-label="Колір костюма">
                <p className="caption-3 hero-color-name">{current.label}</p>
                <div className="hero-dots">
                  {COLORS.map((item) => (
                    <button
                      key={item.id}
                      className="dot-button"
                      type="button"
                      aria-label={item.label}
                      aria-pressed={item.id === current.id}
                      onClick={(event) => pickFromHero(event, item.label)}
                    >
                      <span className="dot" style={{ background: item.swatch }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="hero-cta">
                <span className="title-2 num">2300 грн</span>
                <a className="btn btn-light button-md" href="#order">Замовити</a>
              </div>
            </div>
          </div>
        </section>

        <section className="section container" id="colors" aria-labelledby="colors-title">
          <div className="section-head reveal">
            <h2 className="heading-3" id="colors-title">Один крій, п'ять настроїв</h2>
            <p className="body-3 muted">Натисни на колір, і вся сторінка перефарбується в нього.</p>
          </div>
          <ul className="colors-row reveal">
            {COLORS.map((item) => (
              <li key={item.id}>
                <button
                  className="color-card"
                  type="button"
                  aria-pressed={item.id === current.id}
                  onClick={() => setColor(item.label)}
                >
                  <span className="color-photo">
                    <img src={item.photo} alt={`Костюм Комі, колір ${item.label}, вигляд на повний зріст`} loading="lazy" />
                  </span>
                  <span className="title-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="tagline container" aria-label="Головне про костюм">
          <p className="heading-1 tagline-text" ref={taglineRef}>
            {TAGLINE.map((line) => (
              <span className="tagline-line" key={line}>
                {line.split(" ").map((word) => (
                  <span className="word" key={wordIndex++}>{word} </span>
                ))}
              </span>
            ))}
          </p>
        </section>

        <section className="section container" id="fabric" aria-labelledby="fabric-title">
          <div className="fabric-grid">
            <div className="fabric-copy reveal">
              <p className="caption-3 eyebrow">Тканина</p>
              <h2 className="heading-3" id="fabric-title">Кучерявий ворс зовні, м'який фліс усередині</h2>
              <ul className="fabric-list body-3 muted">
                <li>Шерпа на флісовій основі</li>
                <li>Широкі рукави на манжетах із резинкою</li>
                <li>Об'ємний капюшон</li>
                <li>Штани з кишенями, резинкою і шнурком у поясі</li>
              </ul>
            </div>
            <figure className="fabric-photo reveal">
              <img src="/komi/texture.webp" alt="Кучерявий ворс шерпи на рукаві зблизька" loading="lazy" />
            </figure>
          </div>
          <figure className="pocket reveal">
            <img src="/komi/pocket.webp" alt="Пояс на резинці зі шнурком і фактура шерпи зблизька" loading="lazy" />
          </figure>
        </section>

        <section className="section container" id="sizes" aria-labelledby="sizes-title">
          <div className="section-head reveal">
            <h2 className="heading-3" id="sizes-title">Один розмір, точні заміри</h2>
          </div>
          <div className="sizes reveal">
            <div className="size-card">
              <h3 className="title-1">Худі</h3>
              <dl className="size-list body-3">
                <div><dt className="muted">Груди</dt><dd className="num">126 см</dd></div>
                <div><dt className="muted">Рукав із плечем</dt><dd className="num">78 см</dd></div>
                <div><dt className="muted">Довжина</dt><dd className="num">62 см</dd></div>
              </dl>
            </div>
            <div className="size-card">
              <h3 className="title-1">Штани</h3>
              <dl className="size-list body-3">
                <div><dt className="muted">Талія</dt><dd className="num">60–80 см</dd></div>
                <div><dt className="muted">Стегна</dt><dd className="num">116 см</dd></div>
                <div><dt className="muted">Довжина</dt><dd className="num">104 см</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="section container" id="order" aria-labelledby="order-title">
          <div className="order">
            <div className="order-copy">
              <p className="caption-3 eyebrow">Комі, 2300 грн</p>
              <h2 className="heading-3" id="order-title">Оформіть замовлення на свій колір</h2>
              <span className="order-photo">
                <img src={current.photo} alt={`Обраний колір: ${current.label}`} loading="lazy" />
              </span>
            </div>
            <OrderForm color={color} onColorChange={setColor} />
          </div>
        </section>
      </main>

      <footer className="footer container caption-2 muted">
        <p>MAAAARKA. Навчальний проєкт, домашнє завдання.</p>
      </footer>
    </div>
  );
}
