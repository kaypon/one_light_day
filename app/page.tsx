import { Hero } from "@/components/Hero";
import { Method } from "@/components/Method";
import s from "./page.module.css";

export default function Page() {
  return (
    <>
      <header className={s.topbar}>
        <a href="#" className={s.wordmark}>
          One Light-Day
        </a>
        <a href="#method" className={s.navLink}>
          How we know
        </a>
      </header>
      <main>
        <Hero />
        <Method />
      </main>
    </>
  );
}
