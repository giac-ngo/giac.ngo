import { useDocumentTitle } from "@/hooks/use-document-title";

export default function MandalaMerit() {
  useDocumentTitle("Mandala of Merit", "The Mandala of Merit — towards a DAO of Awakening. Bodhi Lab's vision for decentralized dharma governance.");
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <article className="space-y-12">
        {/* Header */}
        <header className="text-center space-y-6 pb-8 border-b">
          <h1 className="font-serif text-4xl font-bold text-foreground">
            The Mandala of Merit
          </h1>
          <p className="font-serif text-xl italic text-muted-foreground">
            Towards a DAO of Awakening
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p className="font-serif font-semibold">Bodhi Lab</p>
            <p className="font-serif">Bodhi Technology Lab</p>
            <p className="font-serif text-sm italic">January 2025</p>
          </div>
        </header>

        {/* Introduction */}
        <section className="space-y-4">
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              The ultimate vision is to gradually dissolve all centralized control and surrender the ecosystem to the collective wisdom of an awakened community. Every action – a wise post, a helpful answer, a selfless act of Dana – is recorded as merit, not as "influence."
            </p>
            <p>
              Power and governance are decided not by speculation, but by the true virtue of each soul. Records of actions, merit, and self-transcendence guide the community. True "decentralization" is not just technical: it is the realization that each is the Center and Each is the Whole. Leadership emerges, dissolves, and is re-formed as the flow of merit dictates.
            </p>
          </div>
        </section>

        {/* The Intrinsic Merit Token */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-merit-token">
            The Intrinsic Merit Token
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              The "Intrinsic Merit Token" is introduced not as a cryptocurrency for speculation, but as a digital token that transparently records and incentivizes merit-generating actions: insightful posts, acts of charity, hours of service. Token holders gain voting rights in community decisions, budgeting, and project direction, ensuring that the platform always serves the Dharma and the Sangha, not private interests. Complete trustlessness and transparency is the goal.
            </p>
            <p>
              Total control and decision making is powered by DAO, which digitally records all Good Karma to forever eliminate Tăng Đoàn's (Sangha's) monetary dependence and consolidate the power of Tăng Đoàn to unite with one heart. This unique Dao Token Merit is passed on to the legacy of the Sainthood, a place to serve infinite Buddhas and regain the Dharma Body for generations to come.
            </p>
          </div>
        </section>

        {/* Governance Principles */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-governance">
            Governance Principles
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Merit-Based Decision Making
            </h3>
            <p>
              In the Awakened DAO, governance power flows from genuine spiritual contribution, not financial speculation. Each token represents a verifiable record of merit-generating actions – teaching, giving, serving, transforming suffering. This creates an incentive structure aligned with the Dharma itself.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Transparent Operations
            </h3>
            <p>
              All platform decisions, resource allocations, and merit distributions are recorded on an immutable ledger. Community members can audit every transaction, ensuring that the ecosystem remains true to its spiritual mission. There are no hidden agendas, no backroom deals – only the clear light of transparency.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Collective Wisdom
            </h3>
            <p>
              The DAO recognizes that wisdom emerges from the collective, not from any single authority. Major decisions are made through community consensus, weighted by merit contribution. This ensures that those who have demonstrated commitment to awakening have a voice in guiding the platform's evolution.
            </p>
          </div>
        </section>

        {/* The Path Forward */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-path-forward">
            The Path Forward
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              The Awakened DAO is not an end state but a living process. As the community matures in practice and understanding, governance structures will evolve. What begins as guided stewardship will gradually dissolve into true collective self-organization.
            </p>
            <p>
              This is the great paradox: we build institutions designed to dissolve themselves. The most successful DAO is one that makes itself obsolete, having fulfilled its purpose of awakening the collective. When that day comes, the Mandala will shine clearly, and the platform will return to the vast void from which it arose.
            </p>
            <p className="italic border-l-4 border-primary pl-6 py-4 text-muted-foreground">
              "True decentralization is not just technical: it is the realization that each is the Center and Each is the Whole."
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

