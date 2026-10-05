import { DsnPanel } from "@/components/dsn/DsnPanel";
import { Hero } from "@/components/Hero";
import { Method } from "@/components/Method";
import { PingSection } from "@/components/ping/PingSection";
import { LagTimeline } from "@/components/timeline/LagTimeline";
import { WobbleSection } from "@/components/wobble/WobbleSection";
import s from "./page.module.css";

export default function Page() {
  return (
    <>
      <header className={s.topbar}>
        <a href="#" className={s.wordmark}>
          One Light-Day
        </a>
        <nav className={s.nav} aria-label="Sections">
          <a href="#ping">Send a ping</a>
          <a href="#dsn">Who&apos;s listening</a>
          <a href="#method">How we know</a>
        </nav>
      </header>
      <main>
        <Hero />
        <PingSection />
        <DsnPanel />
        <WobbleSection />
        <LagTimeline />
        <Method />
      </main>
    </>
  );
}
