import { useDocumentTitle } from "@/hooks/use-document-title";

export default function PathOfUnraveling() {
  useDocumentTitle("Path of Unraveling", "The Path of Unraveling — beyond gamification. A dharma-aligned approach to community engagement.");
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <article className="space-y-12">
        {/* Header */}
        <header className="text-center space-y-6 pb-8 border-b">
          <h1 className="font-serif text-4xl font-bold text-foreground">
            The Path of "Unraveling"
          </h1>
          <p className="font-serif text-xl italic text-muted-foreground">
            Beyond Gamification
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
              This system is designed as a mirror for reflection, not a race for medals or accumulation. All titles, certificates, and tokens belong to the world of form. This system encourages the journey of "Letting Go" and "Offering." All is by Mirror, not Medal.
            </p>
          </div>
        </section>

        {/* The Unraveling System */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-unraveling-system">
            The Unraveling System (NFT Badges)
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              <strong>Transformation Badges:</strong> Not for "grinding." Badges (NFTs) are the recognition of inner victories: overcoming anger, transforming suffering. They are awarded by the Sangha or AI after verifying genuine inner transformation (<em>chuyển hóa tập khí</em>).
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              <li><strong>Badge of Transcending Anger:</strong> Awarded for overcoming 10 situations of being cursed without anger (verified by others)</li>
              <li><strong>Badge of Understanding the Master's Intent:</strong> Awarded for correctly answering 10 root Dharma questions without AI assistance</li>
              <li><strong>Badge of Acting without Dharma:</strong> Awarded for successfully guiding 5 friends to an insight (verified by them)</li>
              <li><strong>Badge of Four Immeasurables:</strong> Awarded for successfully helping, forgiving, and embracing all old, difficult relationships</li>
            </ul>
          </div>
        </section>

        {/* The Ultimate Badge */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-ultimate-badge">
            The Ultimate Badge: "No-Cultivation, No-Attainment"
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              <strong>The Ultimate Badge: "No-Cultivation, No-Attainment" (<em>Vô Tu Vô Chứng</em>):</strong> The final Master's Certificate is the "Certificate of No Certificate."
            </p>
            <p>
              This is a core principle pointing directly at the truth: <strong>No-Cultivation (Vô Tu)</strong> refers to the fact that your true Self-Nature is already complete and perfect (Buddha-Nature). You do not need to strive, practice, or add anything to it. The path is not one of becoming, but of recognizing. <strong>No-Attainment (Vô Chứng)</strong> refers to the fact that there is no thing to gain or achieve. Enlightenment is not a future state you acquire. It is the immediate realization of what you have always been.
            </p>
            <p>
              Therefore, liberation comes from Letting Go (<em>Buông Bỏ</em>) of the ignorance and attachments that veil this inherent perfection, not from an effortful cultivation to attain a goal.
            </p>
            <p>
              A hidden "Dark Badge" is designed, tentatively named "<em>No-Cultivation, No-Attainment</em>." Each time a user chooses to hide, delete, or disable one of their Transformation Badges (an achievement), the system adds one point to this hidden badge.
            </p>
            <p>
              <strong>The Ultimate Minting Act:</strong> When a user, with sufficient conditions and wisdom, realizes all achievements are temporary means and manually destroys all of their Transformation Badges, the system automatically mints one special, final NFT: "No-Cultivation, No-Attainment".
            </p>
            <p>
              <strong>The Nameless Leaderboard:</strong> This NFT enrolls the user on the "Nameless Leaderboard," which honors those who have let go of being honored. This final act is "Letting Go of All," returning to Non-Abiding (<em>Vô Trụ</em>).
            </p>
            <p className="italic text-muted-foreground">
              All is by Mirror, not Medal.
            </p>
          </div>
        </section>

        {/* The Merit Economy */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold text-foreground" data-testid="heading-merit-economy">
            The Merit Economy: Incentivizing True Practice
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Beyond Likes and Shares
            </h3>
            <p>
              The token allocation mechanism explicitly rewards inner cultivation. In the Awakening Network, a "Like" granted from a mind that is truly appreciative and present is worth a hundred from a mechanical mind. A "Share" with the sincere intention of helping others is worth a thousand from a showy mind. The platform will recognize interactions that arise from <em>Chánh Niệm</em> (Right Mindfulness).
            </p>

            <h3 className="font-serif text-xl font-semibold text-foreground pt-4">
              Rewarding Inner Work
            </h3>
            <p>
              Features track and reward:
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              <li><strong>"Letting Go Challenges":</strong> Instead of "Grinding Challenges." Reward users who "choose not to continue arguing" and opt for "peaceful silence" or "voluntarily relinquish" a position of power. These actions, though they may not get social recognition, are what truly generate deep and perfect Intrinsic Merit</li>
              <li><strong>"Self-Reflection Journal":</strong> The user records moments when they recognize and overcome a habit or delusion</li>
              <li><strong>"Thank You - Forgiveness Letter":</strong> Allows users to send letters of gratitude, apology, or forgiveness. Each letter sent/forgiven is acknowledged as Merit</li>
              <li><strong>"Wakefulness Timer":</strong> Reward users for hours spent away from social media and present in real life, or hours spent in a state of 24/24 Mindfulness</li>
              <li><strong>"Deep Listening Practice":</strong> Create interactive listening rooms where users practice deeply hearing others' stories without judgment. Merit is not recorded for talking, but for truly listening and understanding</li>
            </ul>
            <p>
              Record the number of times a user "voluntarily relinquishes" a position/power/benefit in a group for the greater good. Acknowledge the number of times a user "finds an answer to their own question" after dialoguing with the AI.
            </p>
            <p className="italic border-l-4 border-primary pl-6 py-4 text-muted-foreground">
              "True merit arises not from accumulation, but from letting go. Not from gaining recognition, but from serving in silence."
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}

