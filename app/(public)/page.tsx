'use client';

import dynamic from 'next/dynamic';
import { LandingNav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { StagesSection } from '@/components/landing/stages';
const CardJourney = dynamic(
  () => import('@/components/landing/card-journey').then(m => m.CardJourney),
  { ssr: false },
);

const DemoBoardSection = dynamic(
  () => import('@/components/landing/demo-board').then(m => m.DemoBoardSection),
  { ssr: false },
);
import { AnalyticsSection } from '@/components/landing/analytics';
import { MarketplaceSection } from '@/components/landing/marketplace';
import { CTASection } from '@/components/landing/cta';
import { LandingFooter } from '@/components/landing/footer';
import { RevealOnScroll } from '@/components/landing/reveal';

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <header className="hero" id="demo">
        <div className="wrap">
          <Hero />
          <RevealOnScroll>
            <div id="board" className="hero-board-wrap" style={{ scrollMarginTop: '80px' }}>
              <div className="hero-board-caption">
                <span className="mono">TRY IT</span>
                <span>Drag any card between columns {'\u2014'} it{'\u2019'}s the real board.</span>
              </div>
              <DemoBoardSection />
            </div>
          </RevealOnScroll>
        </div>
      </header>

      <section id="stages">
        <div className="wrap">
          <div className="section-head split reveal in">
            <div>
              <div className="section-eyebrow" data-index="01">Pipeline stages</div>
              <h2 className="section-title">Four columns. <em>One compass.</em></h2>
            </div>
            <p className="section-desc">
              Every stage has its own context {'\u2014'} the work you{'\u2019'}re doing, the metrics that matter, the signals worth tracking. Hover a stage to see what Maakavoda measures for you there.
            </p>
          </div>
          <RevealOnScroll>
            <StagesSection />
          </RevealOnScroll>
          <RevealOnScroll>
            <CardJourney />
          </RevealOnScroll>
        </div>
      </section>

      <section id="analytics">
        <div className="wrap">
          <div className="section-head split reveal in">
            <div>
              <div className="section-eyebrow" data-index="02">Analytics that matter</div>
              <h2 className="section-title">Turn your pipeline into <em>leverage</em>.</h2>
            </div>
            <p className="section-desc">
              Applying blindly is exhausting. Maakavoda shows you exactly where roles get stuck, which sources produce real offers, and when to double down {'\u2014'} so every hour of searching gets a little more efficient than the last.
            </p>
          </div>
          <RevealOnScroll>
            <AnalyticsSection />
          </RevealOnScroll>
        </div>
      </section>

      <section id="marketplace">
        <div className="wrap">
          <div className="section-head split reveal in">
            <div>
              <div className="section-eyebrow" data-index="03">Resume marketplace</div>
              <h2 className="section-title">See what <em>actually</em> gets callbacks.</h2>
            </div>
            <p className="section-desc">
              Upload a redacted version of your resume, collect anonymous ratings and notes from other job hunters, and browse the top-rated ones for inspiration. Fully anonymous {'\u2014'} no names, no companies, no identifying details.
            </p>
          </div>
          <RevealOnScroll>
            <MarketplaceSection />
          </RevealOnScroll>
        </div>
      </section>

      <section style={{ paddingTop: '40px' }}>
        <div className="wrap">
          <RevealOnScroll>
            <CTASection />
          </RevealOnScroll>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
