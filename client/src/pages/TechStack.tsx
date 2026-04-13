import { useDocumentTitle } from "@/hooks/use-document-title";

export default function TechStack() {
  useDocumentTitle("Tech Stack", "The architecture of awakened technology — Bodhi Lab's tech stack for Buddhist community platforms.");
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <article className="space-y-12">
        {/* Header */}
        <header className="text-center space-y-6 pb-8 border-b">
          <h1 className="font-serif text-4xl font-bold text-foreground">
            The Architecture of Awakened Technology
          </h1>
          <p className="font-serif text-xl italic text-muted-foreground">
            The Bodhi Lab Tech Stack
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p className="font-serif font-semibold">Bodhi Lab</p>
            <p className="font-serif">Bodhi Technology Lab</p>
            <p className="font-serif text-sm italic">January 2025</p>
          </div>
        </header>

        {/* Section 1: Vision & Mission */}
        <section className="space-y-4">
          <h2 id="vision-mission" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-vision-mission">
            Vision & Mission
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              <strong>Our Vision:</strong> To become the world's first, most profound digital community where spirituality meets technology; where every interaction, every shared insight, is an opportunity to generate Intrinsic Merit and accelerate collective awakening.
            </p>
            <p>
              <strong>Our Mission:</strong> To provide tools, teachings, and a nurturing community that supports individuals and Sanghas (spiritual communities) on their journey to awakening. To demystify Intrinsic Merit (<em>Công Đức</em>) and make it the central currency of a new, more conscious civilization. To build alliances with all traditions that honor the same non-dual Truth.
            </p>
          </div>
        </section>

        {/* Section 2: Collective Compute Mandala */}
        <section className="space-y-4">
          <h2 id="compute-mandala" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-compute-mandala">
            Foundation: The Collective Compute Mandala
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              The Bodhi Lab Ecosystem is built upon a global network of decentralized off-chain computation nodes, acting as a collective supercomputer.
            </p>
            <p>
              Our philosophy begins with the rejection of centralized platforms. The "Sickness of the Digital Age" is fueled by centralized GPU farms (AWS, Google Cloud) which are designed to "harvest the human mind" as a commodity. To build a "sacred digital vessel," we must build on a foundation that has no single ruling entity. This decentralized infrastructure provides the perfect technical foundation, in parallel with our philosophy:
            </p>
            <ul className="list-disc pl-8 space-y-3 text-muted-foreground">
              <li>
                <strong>Breaking Centralization (<em>Phá Chấp Ngã</em>):</strong> By leveraging the pooled computational capabilities of independent user-run nodes, we break the dependency on central servers, just as Giác Ngộ breaks the dependency on the "worldly ego."
              </li>
              <li>
                <strong>Elastic Scalability (<em>Pháp Thân Biến Mãn</em>):</strong> The platform is elastic by default. It can burst instantly across thousands of nodes for heavy jobs (like AI training) and, crucially, scale to zero when idle. This reflects the nature of the Mind: powerfully present when needed, perfectly still when not.
              </li>
              <li>
                <strong>Sustainable Primitives (<em>Tận Dụng Duyên Lành</em>):</strong> The network capitalizes on idle computing power, utilizing existing, often-underutilized resources. This principle of non-waste reduces total energy per useful task and aligns with the Dharma, turning the world's latent potential (<em>duyên</em>) into a tool for awakening.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Mandala Ledger */}
        <section className="space-y-4">
          <h2 id="mandala-ledger" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-mandala-ledger">
            Protocol Layer 1: The Mandala Ledger
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p className="italic text-muted-foreground">
              Leveraging Verifiable Off-Chain Ledgers
            </p>
            <p>
              The Flow of Awakening, the Dharma Library, and the merit profile of each practitioner create an immense amount of data that cannot be stored entirely on-chain.
            </p>
            <p>
              We leverage verifiable off-chain ledgers. The entire history of shared wisdom, Dharma talks, and merit-generating actions is organized as Acyclic Data (DAG) structures. These structures are then reliably anchored to the blockchain, creating verifiable rails for our ecosystem.
            </p>
            <p>
              This allows Bodhi Lab to maintain an immutable record of collective wisdom and merit history—our <strong>Mandala Ledger</strong>—without sacrificing speed or cost.
            </p>
          </div>
        </section>

        {/* Section 4: Merit Attribution Protocol */}
        <section className="space-y-4">
          <h2 id="merit-protocol" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-merit-protocol">
            Protocol Layer 2: Merit Attribution Protocol
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p className="italic text-muted-foreground">
              A Spiritual Extension of Verifiable Compute
            </p>
            <p>
              The network's economy is built on a protocol for compute attribution and reputation—a universal standard for rewarding nodes based on verifiable computational proof.
            </p>
            <p>
              The Bodhi Lab Ecosystem extends this philosophy to a higher layer, creating the <strong>Merit Attribution Protocol</strong>:
            </p>
            <ul className="list-disc pl-8 space-y-3 text-muted-foreground">
              <li>
                <strong>Compute Protocol (Technical Layer):</strong> Verifies technical actions. Example: "Did this node truly store and serve this Dharma talk?"
              </li>
              <li>
                <strong>Merit Protocol (Spiritual Layer):</strong> Verifies the intent and quality of an action. Example: "Was this 'Like' action mindful?" "Was this 'Unraveling' of an NFT Badge a true act of letting go?"
              </li>
            </ul>
            <p>
              The network's protocol provides trustlessness for the hardware. Our Merit Protocol provides transparency for the Mind (<em>Tâm</em>). Our Mandala Tokenomic cannot be speculated upon because it is anchored to both verifiable computational proof and verifiable spiritual transformation (attestations).
            </p>
          </div>
        </section>

        {/* Section 5: Universal Primitives */}
        <section className="space-y-4">
          <h2 id="primitives" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-primitives">
            Universal Primitives: Building on the Collective Supercomputer
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              We do not build our core functions from scratch. We construct our pillars by deploying tasks to the network's Universal Primitives.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Decentralized AI: The Threefold AI Vehicle (<em>Tam Thừa AI</em>)
            </h3>
            <p>
              The Bodhi Lab Assistants (Tâm An, Giác Ngộ, Đốn Ngộ) are not proprietary models on a central server. They are deployed as elastic inference micro-services that scale to zero. Their wisdom is fine-tuned (e.g., LoRA / distributed fine-tuning) on the Dharma teachings using the pooled nodes. This is open-model friendly (supporting HF, PyTorch, etc.) and makes the Dharma uncensorable.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Verifiable Storage: The Dharma Observatory (<em>Đài Quan Sát Pháp</em>)
            </h3>
            <p>
              The entire Library of Wisdom is stored using decentralized storage primitives. We use the network's media pipelines (for transcription, translation, and vision) and RAG at scale (crawl, embed, index) to make all Dharma talks searchable and accessible to the AI Assistants, ensuring the timeless teachings are preserved perpetually.
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Trustless Reputation: The Awakened DAO (<em>Bodhi Lab DAO</em>)
            </h3>
            <p>
              Our governance system is anchored to the verifiable pipelines of the network. When a user performs a merit-generating action (verified by our Merit Protocol), that action is recorded via the Mandala Ledger and receives a verifiable attestation. This creates a truly trustless governance system, where the Dao Token is a transparent record of merit, not a tradable financial asset.
            </p>
          </div>
        </section>

        {/* Section 6: Privacy by Dharma */}
        <section className="space-y-4">
          <h2 id="privacy-dharma" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-privacy-dharma">
            Privacy by Dharma
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p className="italic text-muted-foreground">
              Leveraging Consent-First Data
            </p>
            <p>
              Our platform adheres to the "Privacy by Dharma" principle. Because we do not rely on central servers, there is no data mining. We leverage the network's consent-first data access model.
            </p>
            <p>
              We will never bypass paywalls or violate privacy. For our Sangha partners, privacy- and region-aware processing ensures that sensitive data (e.g., PII or EU-only data) remains within its allowed jurisdiction, running transforms locally and exporting only anonymized artifacts. User data is sovereign. True practice cannot coexist with surveillance capitalism.
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

