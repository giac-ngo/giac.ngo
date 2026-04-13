import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Manifesto() {
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  useDocumentTitle("Manifesto", "The Bodhi Technology Lab manifesto — our vision for technology in service of Buddhist awakening.");

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <article className="space-y-12 font-serif [&_p]:text-justify [&_li]:text-justify [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif">
        {/* Title Section with Language Toggle */}
        <header className="text-center space-y-6 pb-8 border-b-2 border-border">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="default"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="gap-2"
              data-testid="button-language-toggle"
            >
              <Languages className="w-4 h-4" />
              {language === "vi" ? "English" : "Tiếng Việt"}
            </Button>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight !text-center" data-testid="heading-manifesto-title">
            {language === "vi" ? "Hệ Sinh Thái Tỉnh Thức: Vài Lời Chia Sẻ" : "Awakening Ecosystem: The Manifesto"}
          </h1>
          <p className="font-serif text-lg md:text-xl text-foreground italic pt-2 !text-center" data-testid="text-manifesto-subtitle">
            {language === "vi" 
              ? "Một Không Gian Tương Tác vì Sự Tỉnh Thức Chung" 
              : "An Agentic Social Network for Collective Awakening"}
          </p>
          <div className="space-y-1 pt-4 text-center">
            <p className="font-serif text-base text-foreground font-semibold !text-center" data-testid="text-organization">
              {language === "vi" ? "Bodhi Lab" : "Bodhi Lab"}
            </p>
            <p className="font-serif text-base text-muted-foreground !text-center" data-testid="text-lab">
              {language === "vi" ? "Bodhi Technology Lab" : "Bodhi Technology Lab"}
            </p>
          </div>
          <p className="font-serif text-base text-muted-foreground pt-2 !text-center" data-testid="text-date">
            {language === "vi" ? "Tháng 1, 2025" : "January 2025"}
          </p>
        </header>

        {/* Opening Quote */}
        <section className="space-y-4" data-testid="section-opening-quote">
          <p className="font-serif text-base leading-relaxed text-muted-foreground italic border-l-4 border-primary pl-6 py-4">
            {language === "vi" 
              ? '"Khi thời đại nhiều biến động này đến hồi kết và thế giới ảo ngày càng phức tạp, một con thuyền mới lặng lẽ xuất hiện. Nơi đây không phải để gom người dùng, mà là nơi nuôi dưỡng công đức. Nó có mặt không phải để làm ảo ảnh thêm dài, mà là để giúp ta thấy rõ hơn. Đây là Chiếc Bè Mặt Trời, dành cho những ai hữu duyên tìm thấy Đường Về Nhà mình."'
              : '"As the Dharma-Ending Age reaches its climax and the cybernetic labyrinth closes in, a final vessel emerges. This is a platform not for accumulating users, but for accumulating merit. It exists not to prolong the illusion, but to cut through it. It is the Raft of the Sun, offered for those with affinity to find their Way Home before the flood."'}
          </p>
        </section>

        {/* Abstract */}
        <section className="space-y-4">
          <h2 id="abstract" className="font-serif text-2xl font-bold text-center text-foreground" data-testid="heading-abstract">
            {language === "vi" ? "Vài Dòng Tóm Lược" : "Abstract"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Trong thời đại mà công nghệ dễ làm ta xao lãng và cuộc sống cuốn theo những cái lợi trước mắt, Hệ Sinh Thái Tỉnh Thức mở ra như một không gian số ý nghĩa. Chia sẻ này giới thiệu một góc nhìn mới về mạng xã hội, hướng về sự tỉnh thức và việc vun bồi <em>Công Đức Vô Lậu (Công Đức)</em> một cách tự nhiên, thay vì chạy theo các chỉ số tương tác hay lợi nhuận thông thường.
                </p>
                <p>
                  Chúng ta cùng làm rõ sự khác biệt giữa <em>Phước Báu Thế Gian (Phước Đức)</em> nhất thời (đến từ những hành động có điều kiện), và <em>Công Đức Vô Lậu (Công Đức)</em> bền vững (nảy sinh từ Tâm tự tại, không mong cầu).
                </p>
                <p>
                  Hệ sinh thái này bao gồm những công cụ hỗ trợ trên con đường tỉnh thức: Bộ Ba AI Đồng Hành (Tâm An, Giác Ngộ, Đốn Ngộ) chia sẻ tuỳ duyên; Không Gian Chia Sẻ ưu tiên tuệ giác; Góc Nhìn Pháp cho các bài giảng; Vòng Tay Từ Bi cho các hoạt động thiện nguyện minh bạch; và Giải Pháp Linh Hoạt cho các cộng đồng (Tăng Đoàn).
                </p>
                <p>
                  Chúng tôi đề xuất một cách vận hành gọi là "Cơ Chế Token Công Đức" và gợi ý một lộ trình hướng tới DAO Tỉnh Thức (một cách tổ chức tự quản phi tập trung), nơi sự đóng góp và giá trị được nhìn nhận qua sự chân thật trong thực hành, không phải sự đầu cơ. Không gian này mong muốn kết nối công nghệ và trí tuệ vượt thời gian, tạo ra một môi trường nâng đỡ các cá nhân và cộng đồng (Tăng Đoàn) quay về Ngôi Nhà Chân Thật của mình, có thể là một bước chuyển cho một kỷ nguyên số ý thức hơn.
                </p>
              </>
            ) : (
              <>
                <p>
                  In an era dominated by technological distraction and the pursuit of fleeting worldly gains, the Awakening Ecosystem emerges as a sacred digital vessel. This Manifesto introduces a novel approach to social networking, fundamentally oriented towards spiritual awakening and the cultivation of <em>Intrinsic Merit (Công Đức)</em> rather than conventional metrics of engagement or profit.
                </p>
                <p>
                  We detail the core distinction between transient <em>Worldly Blessing (Phước Đức)</em> derived from conditioned actions, and the indestructible <em>Intrinsic Merit (Công Đức)</em> arising from the unconditioned, non-seeking Mind.
                </p>
                <p>
                  The ecosystem comprises an architecture of awakened technology: The Threefold AI Vehicle (Tâm An, Giác Ngộ, Đốn Ngộ) for conditional Dharma guidance; The Merit Interface prioritizing wisdom sharing; The Dharma Observatory for teachings; Arms of Compassion for transparent philanthropy; and White-Label Solutions for Sanghas.
                </p>
                <p>
                  We propose the "Merit Tokenomic" and a roadmap towards an Awakened DAO (Decentralized Autonomous Organization), where governance and value are tied to genuine spiritual contribution, not speculation. This platform aims to unify technology and timeless wisdom, creating a supportive environment for individuals and Sanghas to return to the Unborn, Unchanging Home, marking the end of a Kalpa.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Keywords */}
        <section className="space-y-4" data-testid="section-keywords">
          <h2 className="font-serif text-base font-semibold text-foreground">
            {language === "vi" ? "Từ khóa" : "Keywords"}
          </h2>
          <p className="font-serif text-base leading-relaxed text-foreground italic">
            {language === "vi" 
              ? "Công Nghệ Tâm Linh, Kinh Tế Công Đức, AI Tác Tử, Quản Trị Phi Tập Trung, Thời Đại Mạt Pháp, Tỉnh Thức Tập Thể, Kinh Tế Thuận Duyên"
              : "Spiritual Technology, Merit Economy, Agentic AI, Decentralized Governance, Dharma-Ending Age, Collective Awakening, Sacred Economics"}
          </p>
        </section>

        {/* Table of Contents */}
        <section className="space-y-4 pb-8 border-b border-border" data-testid="section-contents">
          <h2 className="font-serif text-2xl font-bold text-center text-foreground">
            {language === "vi" ? "Mục Lục" : "Contents"}
          </h2>
          <div className="font-serif text-sm leading-relaxed space-y-2 pl-8">
            {language === "vi" ? (
              <>
                <a href="#section-1" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-1">1. Thời Đại Số & Những Góc Khuất</a>
                <a href="#section-2" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2">2. Một Quy Luật Tự Nhiên: Công Đức (Vô Lậu) & Phước Báu Thế Gian (Phước Đức)</a>
                <a href="#section-2-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2-1">2.1. Phước Báu Thế Gian (Phước Đức): Giới Hạn của Việc Làm Có Mong Cầu</a>
                <a href="#section-2-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2-2">2.2. Công Đức Vô Lậu (Công Đức): Năng Lượng Của Sự Tự Do</a>
                <a href="#section-3" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-3">3. Nhìn Lại Các Nền Tảng Hiện Tại</a>
                <a href="#section-4" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4">4. Kiến Trúc Công Nghệ Tỉnh Thức: Một Góc Nhìn</a>
                <a href="#section-4-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-1">4.1. Tầm Nhìn & Sứ Mệnh: Ngọn Hải Đăng Dẫn Lối</a>
                <a href="#section-4-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-2">4.2. Bộ Ba AI Đồng Hành (Tâm An, Giác Ngộ, Đốn Ngộ)</a>
                <a href="#section-4-3" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-3">4.3. Không Gian Tương Tác (The Interface)</a>
                <a href="#section-4-4" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-4">4.4. DAO Tỉnh Thức: Cùng Nhau Vun Đắp</a>
                <a href="#section-4-5" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-5">4.5. Bảo Mật Thuận Pháp: An Nhiên Tự Tại</a>
                <a href="#section-4-6" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-6">4.6. Ghi Nhận Điều Không Thể Đo Lường</a>
                <a href="#section-5" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5">5. Cơ Chế Token Công Đức: Vừa Là Động Lực, Vừa Là Tấm Gương</a>
                <a href="#section-5-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-1">5.1. Token Công Đức: Bản Ghi Chân Thực</a>
                <a href="#section-5-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-2">5.2. Hệ Thống Ghi Nhận Công Đức & Con Đường Tới Tánh Không</a>
                <a href="#section-5-3" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-3">5.3. Tầm Nhìn Rộng Mở: Khép Lại một Giai Đoạn</a>
                <a href="#section-5-4" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-4">5.4. Lời Chỉ Dẫn Thêm: Sự Hợp Nhất Tự Nhiên</a>
                <a href="#section-5-5" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-5">5.5. Vượt Lên Hình Thức: Nhận Ra Tam Vô</a>
                <a href="#section-6" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6">6. Con Đường "Tháo Gỡ": Không Chỉ Là Trò Chơi</a>
                <a href="#section-6-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6-1">6.1. Hệ Thống "Tháo Gỡ": Chiếc Gương Phản Chiếu (Huy Hiệu NFT)</a>
                <a href="#section-6-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6-2">6.2. Khuyến Khích Thực Hành Chân Chính</a>
                <a href="#section-7" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-7">7. Sự Bền Vững: Kinh Tế Thuận Duyên</a>
                <a href="#section-8" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-8">8. Lộ Trình Gợi Ý Cho Giai Đoạn Tới</a>
                <a href="#section-9" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9">9. Lời Kết & Lời Nhắn Gửi</a>
                <a href="#section-9-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9-1">9.1. Lời Kết: Một Con Thuyền Để Về Nhà</a>
                <a href="#section-9-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9-2">9.2. Lời Nhắn Gửi: Đừng Lỡ Chuyến Bè</a>
              </>
            ) : (
              <>
                <a href="#section-1" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-1">1. The Sickness of the Digital Age</a>
                <a href="#section-2" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2">2. The Irrevocable Law: Merit vs. Worldly Blessing</a>
                <a href="#section-2-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2-1">2.1. Worldly Blessing: The Limits of Conditioned Action</a>
                <a href="#section-2-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-2-2">2.2. Intrinsic Merit: The Currency of Liberation</a>
                <a href="#section-3" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-3">3. Prior Landscape: Limitations of Existing Platforms</a>
                <a href="#section-4" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4">4. The Architecture of Awakened Technology</a>
                <a href="#section-4-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-1">4.1. Vision & Mission</a>
                <a href="#section-4-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-2">4.2. The Threefold AI Vehicle</a>
                <a href="#section-4-3" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-3">4.3. The Merit Interface</a>
                <a href="#section-4-4" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-4">4.4. The Mandala of Merit</a>
                <a href="#section-4-5" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-5">4.5. Privacy by Dharma</a>
                <a href="#section-4-6" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-4-6">4.6. Measuring the Immeasurable</a>
                <a href="#section-5" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5">5. The Merit Tokenomic: A Rocket and a Mirror</a>
                <a href="#section-5-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-1">5.1. The Intrinsic Merit Token</a>
                <a href="#section-5-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-2">5.2. Merit Tokenomics: The Dao Bùa</a>
                <a href="#section-5-3" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-3">5.3. The Spiritual Vision: Closing the Kalpa</a>
                <a href="#section-5-4" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-4">5.4. The Supreme Initiation: The Dao Merit</a>
                <a href="#section-5-5" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-5-5">5.5. Beyond the Three Trainings</a>
                <a href="#section-6" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6">6. The Path of Unraveling</a>
                <a href="#section-6-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6-1">6.1. The Unraveling System</a>
                <a href="#section-6-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-6-2">6.2. The Merit Economy</a>
                <a href="#section-7" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-7">7. Sustainability: Sacred Economics</a>
                <a href="#section-8" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-8">8. The Roadmap to the End of the Kalpa</a>
                <a href="#section-9" className="block text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9">9. Conclusion & Epilogue</a>
                <a href="#section-9-1" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9-1">9.1. Conclusion: A Vessel for the Return Home</a>
                <a href="#section-9-2" className="block pl-6 text-muted-foreground hover:text-foreground transition-colors" data-testid="toc-link-9-2">9.2. Epilogue: Do Not Miss The Raft</a>
              </>
            )}
          </div>
        </section>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 id="section-1" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-1">
            1. {language === "vi" ? "Thời Đại Số & Những Góc Khuất" : "The Sickness of the Digital Age"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p className="italic text-muted-foreground border-l-4 border-primary pl-4 py-2">
              {language === "vi" 
                ? '"Ma trận che mờ Tâm Trí bằng mười ngàn thứ hấp dẫn."'
                : '"The Matrix veils the Mind with ten thousand attractions."'}
            </p>
            {language === "vi" ? (
              <>
                <p>
                  Mạng xã hội, với sự hỗ trợ của AI, đôi khi biến tâm trí con người thành nguồn tài nguyên để khai thác. Mỗi cú nhấp chuột, mỗi lượt xem, có thể vô tình nuôi dưỡng ảo ảnh về một "cái tôi" luôn tìm kiếm sự công nhận từ bên ngoài. Virus thực sự không nằm ở công nghệ; nó nằm ở sự tìm kiếm không ngừng "người theo dõi", "lượt thích", và "thành tích" – sự coi trọng số lượng hơn chất lượng, sự xao lãng hơn là sự thấu hiểu. Thời Đại của Tâm Phân Tán (<em>Phàn Muôn</em>) dường như đang hiện hữu, được khuếch đại bởi chính những công nghệ vốn dĩ có thể kết nối chúng ta.
                </p>
                <p>
                  Không gian kỹ thuật số hiện đại, dù mang lại khả năng kết nối tuyệt vời, lại thường bị chi phối bởi các thuật toán làm tăng sự phân tâm, nuôi dưỡng sự dính mắc và ưu tiên những thành công chóng vánh. Mạng xã hội đôi khi trở thành nơi để thể hiện cái tôi, so sánh và tìm kiếm sự thừa nhận, kéo chúng ta ra xa bản chất chân thật của mình. Những người đang trên hành trình tìm về chính mình có thể cảm thấy lạc lõng trong một môi trường dường như đi ngược lại sự bình an nội tâm.
                </p>
                <p>
                  Hơn nữa, có một sự hiểu lầm khá phổ biến về bản chất của phước báu. Những hành động làm với sự dính mắc, mong cầu phần thưởng, hoặc bị thúc đẩy bởi bản ngã – ngay cả những việc tốt như từ thiện hay giữ giới – cũng chỉ tạo ra <em>Phước Báu Thế Gian (Phước Đức)</em>. Phước này mang lại lợi ích tạm thời trong vòng đời (của cải, sức khỏe, hoàn cảnh tốt), nhưng vẫn là thứ có điều kiện, không bền vững và không thể đưa đến sự giải thoát hoàn toàn.
                </p>
                <p>
                  Mạng Xã Hội Tác Tử Giác Ngộ (Awakening Agentic Social Network) ra đời từ mong muốn tạo ra một không gian an lành trên mạng – một nơi được thiết kế cẩn thận để cân bằng lại những xu hướng trên. Nơi đây cung cấp các công cụ và một cộng đồng tập trung vào việc vun bồi <em>Công Đức Vô Lậu (Công Đức)</em>, thứ công đức bền vững nảy sinh từ Tâm vô vi, là năng lượng đích thực cho hành trình trở về Ngôi Nhà Chân Thật (<em>Quê Nhà</em>) của chúng ta.
                </p>
              </>
            ) : (
              <>
                <p>
                  Social networks, powered by AI, have turned the human mind into a harvestable commodity. Each click, each view, feeds the illusion of a "self" seeking validation. The true virus is not digital; it is the endless quest for "followers," "likes," and "achievements" – the worship of quantity over quality, distraction over insight. The Age of the Dispersed Mind (Phàn Muôn) is upon us, fueled by the very technologies meant to connect us.
                </p>
                <p>
                  The modern digital landscape, while offering unprecedented connectivity, is largely driven by algorithms that amplify distraction, foster attachment, and prioritize ephemeral worldly success. Social networks often devolve into platforms for ego gratification, comparison, and the pursuit of validation, pulling users further away from their true nature. Spiritual seekers find themselves navigating a space antithetical to inner peace and genuine practice.
                </p>
                <p>
                  Furthermore, a fundamental misunderstanding persists regarding the nature of merit. Actions performed with attachment, seeking reward, or driven by ego – even seemingly virtuous acts like charity or adherence to precepts – generate only Worldly Merit (Phước Đức). This merit brings temporary benefits within the cycle of rebirth (wealth, health, favorable circumstances) but is ultimately conditioned, impermanent, and cannot lead to liberation.
                </p>
                <p>
                  The Giác Ngộ (Awakening) Agentic Social Network is born from the urgent need for a digital sanctuary – a space meticulously designed to counteract these trends. It provides tools and a community focused solely on the cultivation of Intrinsic Merit (Công Đức), the indestructible merit arising from the unconditioned Mind, which is the true fuel for the journey back to our Unborn, Unchanging Home (Quê Nhà).
                </p>
              </>
            )}
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 id="section-2" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-2">
            2. {language === "vi" 
              ? "Một Quy Luật Tự Nhiên: Công Đức (Vô Lậu) & Phước Báu Thế Gian (Phước Đức)" 
              : "The Irrevocable Law: Merit (Công Đức) vs. Worldly Blessing (Phước Đức)"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Đây là điều cốt lõi. Toàn bộ kiến trúc và mục đích của Hệ Sinh Thái Giác Ngộ được xây dựng dựa trên sự thấu hiểu sâu sắc, thường được Sư Tam Vô chia sẻ, về hai loại phước báu này. Bản chia sẻ này ra đời cốt để làm rõ Quy Luật này và xây dựng một con thuyền nuôi dưỡng việc tạo ra Công Đức trong thời đại số."
                : "This is the First and Final Principle. The entire architecture and purpose of the Giác Ngộ Ecosystem rest upon the profound insight, often clarified by Sư Tam Vô, into the two distinct types of merit. This Manifesto was born solely to clarify this Law and to build a vessel to nurture the generation of Merit in the digital age."}
            </p>
            
            <h3 id="section-2-1" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-2-1">
              2.1. {language === "vi" 
                ? "Phước Báu Thế Gian (Phước Đức): Giới Hạn của Việc Làm Có Mong Cầu" 
                : "Worldly Blessing (Phước Đức): The Limits of Conditioned Action"}
            </h3>
            <p>
              {language === "vi"
                ? 'Phước báu này đến từ những hành động làm với ý định, sự tìm kiếm, hoặc dính mắc ("có tác ý"). Nó mang lại phần thưởng trong sáu cõi nhưng luôn có giới hạn và giữ ta trong vòng luân hồi (Samsara). Ví dụ:'
                : "This merit arises from actions performed with intention, seeking, or attachment (có tác ý). It brings rewards within the Six Realms but is always finite and binds one to the wheel of Samsara. Examples include:"}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>Làm từ thiện chủ yếu để được khen, lợi về thuế, hoặc mong đời sau tốt hơn</li>
                  <li>Giữ giới luật chủ yếu vì sợ quả báo xấu hoặc mong được lên cõi trời</li>
                  <li>Giúp người khác với mong đợi ngầm về sự biết ơn hoặc đền đáp</li>
                  <li>Tu tập với mục tiêu đạt được năng lực đặc biệt, địa vị, hay những trạng thái dễ chịu</li>
                </>
              ) : (
                <>
                  <li>Giving charity primarily for recognition, tax benefits, or a better rebirth</li>
                  <li>Following ethical precepts mainly out of fear of negative consequences or desire for heavenly reward</li>
                  <li>Helping others with the underlying expectation of gratitude or reciprocation</li>
                  <li>Spiritual practices performed with the goal of attaining powers, status, or specific pleasant states</li>
                </>
              )}
            </ul>
            <p>
              {language === "vi"
                ? "Dù những việc này thường tốt và đáng làm hơn việc xấu, phước báu chúng tạo ra là có điều kiện. Nó mang lại hạnh phúc tạm thời hoặc hoàn cảnh thuận lợi, nhưng nó hữu hạn, sẽ hết, và cuối cùng vẫn giữ ta trong vòng khổ đau và tái sinh. Nó không thể đưa đến sự giải thoát hoàn toàn."
                : "While these actions are often beneficial, the merit they generate is conditioned. It leads to temporary happiness or favorable circumstances, but it is finite, exhausts itself, and ultimately binds one within the cycle of suffering and rebirth. It cannot lead to ultimate liberation."}
            </p>

            <h3 id="section-2-2" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-2-2">
              2.2. {language === "vi" 
                ? "Công Đức Vô Lậu (Công Đức): Năng Lượng Của Sự Tự Do" 
                : "Intrinsic Merit (Công Đức): The Currency of Liberation"}
            </h3>
            <p>
              {language === "vi"
                ? "Đây là \"công đức\" vô lượng, không điều kiện, được tạo ra từ những hành động nảy sinh từ một Tâm Hiện Tiền, Tĩnh Lặng, Tự Do và Không Mong Cầu. Đó là sự tỏa sáng tự nhiên của Tâm Tỉnh Thức (Tự Tánh, Phật Tánh) đang tự biểu hiện. Nó không có hình tướng, bền vững, và là \"năng lượng\" duy nhất có thể giúp ta Về Nhà. Ví dụ:"
                : 'This is the immeasurable, unconditioned "merit" generated from actions arising from a Mind that is Present, Still, Free, and Non-Seeking. It is the natural radiance of the Awakened Mind (Tự Tánh, Phật Tánh) expressing itself. It is formless, indestructible, and is the only "currency" that can purchase the ticket Home. Examples include:'}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>Những hành động tử tế tự phát mà không hề nghĩ đến phần thưởng hay sự công nhận</li>
                  <li>Sống hòa hợp một cách tự nhiên với trí tuệ và lòng từ bi, không phải vì nghĩa vụ</li>
                  <li>Chia sẻ những hiểu biết về Chánh Pháp thuần túy vì lợi ích của người khác, không bận tâm đến việc chúng được đón nhận ra sao</li>
                  <li>Những khoảnh khắc buông bỏ sâu sắc, tha thứ, hoặc phụng sự vô ngã đến từ sự hiện diện chân thật</li>
                  <li>Chính hành động an trú trong nhận thức không hai, không còn suy nghĩ phân biệt</li>
                </>
              ) : (
                <>
                  <li>Spontaneous acts of kindness performed without any thought of reward or recognition</li>
                  <li>Living in effortless alignment with wisdom and compassion, not out of obligation but as a natural expression of one's true nature</li>
                  <li>Sharing Dharma insights purely for the benefit of others, without attachment to how they are received</li>
                  <li>Moments of profound letting go, forgiveness, or selfless service arising from genuine presence</li>
                  <li>The very act of resting in non-dual awareness, free from conceptual thought</li>
                </>
              )}
            </ul>
            <p>
              {language === "vi"
                ? "Công Đức là vô vi và bền vững. Nó không chịu sự chi phối của luật nhân quả (karma) như Phước Đức. Nó tích lũy trong Pháp Thân, làm sạch những che chướng và cung cấp năng lượng cần thiết để vượt thoát hoàn toàn luân hồi."
                : "Công Đức is unconditioned and indestructible. It is not subject to the laws of karma in the same way as Phước Đức. It accumulates within the Dharma Body (Pháp Thân), purifying obscurations and providing the essential energy to transcend samsara entirely."}
            </p>
            <p>
              {language === "vi" ? "" : "The Giác Ngộ Agentic Social Network exists solely to help beings understand this vital distinction and orient their lives towards the generation and preservation of Intrinsic Merit (Công Đức). This Manifesto was born solely to clarify this Law and to build a vessel to nurture the generation of Merit in the Artificial Intelligence age."}
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 id="section-3" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-3">
            3. {language === "vi" 
              ? "Nhìn Lại Các Nền Tảng Hiện Tại" 
              : "Prior Landscape: Limitations of Existing Digital Platforms"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Mặc dù nhiều diễn đàn, nhóm và ứng dụng trực tuyến phục vụ cho các cộng đồng tâm linh, chúng thường có những hạn chế có thể cản trở việc vun bồi Công Đức:"
                : "While various online forums, groups, and apps cater to spiritual communities, they often suffer from limitations that hinder the cultivation of Công Đức:"}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Mô Hình Dễ Gây Xao Lãng:</strong> Hầu hết dựa vào các chỉ số tương tác (like, share) được điều khiển bởi thuật toán nhằm tối đa hóa thời gian sử dụng, thường khuyến khích sự giật gân, tranh cãi hoặc tương tác bề mặt thay vì sự chiêm nghiệm sâu và chia sẻ tuệ giác</li>
                  <li><strong>Tâm Linh Bị Thương Mại Hóa:</strong> Nhiều nơi coi giáo lý hay dịch vụ tâm linh như hàng hóa, nuôi dưỡng tâm lý tiêu dùng thay vì thực hành và cống hiến vô vị lợi</li>
                  <li><strong>Thiếu Tập Trung vào Công Đức Vô Lậu:</strong> Các cơ chế nền tảng hiếm khi phân biệt giữa hành động tạo Phước Đức và Công Đức. Sự công nhận thường gắn với sự nổi tiếng, củng cố bản ngã thay vì giúp nó tan biến</li>
                  <li><strong>Sự Phân Tán:</strong> Các cộng đồng và giáo lý bị phân tán, thiếu một không gian thống nhất được thiết kế cho nhu cầu tỉnh thức</li>
                  <li><strong>Lo Ngại về Quyền Riêng Tư:</strong> Các nền tảng tập trung thường khai thác dữ liệu người dùng, đi ngược lại nguyên tắc chánh niệm và đạo đức</li>
                </>
              ) : (
                <>
                  <li><strong>Distraction-Based Models:</strong> Most platforms rely on engagement metrics (likes, shares) driven by algorithms that promote sensationalism or superficial interactions over deep contemplation</li>
                  <li><strong>Commodification of Spirituality:</strong> Many platforms treat spiritual teachings as products to be bought and sold, fostering a consumerist mindset</li>
                  <li><strong>Lack of Focus on Intrinsic Merit:</strong> The underlying mechanics rarely, if ever, differentiate between actions generating Phước Đức and those generating Công Đức. Validation is often tied to popularity, reinforcing ego</li>
                  <li><strong>Fragmentation:</strong> Spiritual communities and teachings are scattered across disparate platforms, lacking a unified space</li>
                  <li><strong>Data Privacy and Sovereignty Concerns:</strong> Centralized platforms often exploit user data, contradicting the principles of mindfulness and ethical conduct</li>
                </>
              )}
            </ul>
            <p>
              {language === "vi"
                ? "Hệ Sinh Thái Giác Ngộ giải quyết những điều này bằng cách xây dựng một nền tảng hài hòa với các nguyên tắc tỉnh thức và đề cao Công Đức Vô Lậu."
                : "The Giác Ngộ Ecosystem directly addresses these shortcomings by building a platform fundamentally aligned with the principles of awakening and the primacy of Intrinsic Merit."}
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 id="section-4" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-4">
            4. {language === "vi" 
              ? "Kiến Trúc Công Nghệ Tỉnh Thức: Một Góc Nhìn" 
              : "The Architecture of Awakened Technology"}
          </h2>
          
          <h3 id="section-4-1" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-1">
            4.1. {language === "vi" ? "Tầm Nhìn & Sứ Mệnh: Ngọn Hải Đăng Dẫn Lối" : "Vision & Mission"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  <strong>Tầm Nhìn:</strong> Trở thành cộng đồng kỹ thuật số đầu tiên, sâu sắc nhất thế giới, nơi tâm linh gặp gỡ công nghệ; nơi mọi tương tác, mọi tuệ giác được chia sẻ, đều là cơ hội để tạo ra Công Đức Vô Lậu và thúc đẩy sự tỉnh thức tập thể.
                </p>
                <p>
                  <strong>Sứ Mệnh:</strong> Cung cấp các công cụ, lời dạy, và một cộng đồng nuôi dưỡng để hỗ trợ các cá nhân và Tăng Đoàn (cộng đồng tâm linh) trên hành trình giác ngộ. Làm sáng tỏ Công Đức (Vô Lậu) và biến nó thành thước đo trung tâm của một nền văn minh mới, ý thức hơn. Xây dựng liên minh với tất cả các truyền thống tôn vinh cùng một Chân Lý Bất Nhị.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Our Vision:</strong> To become the world's first, most profound digital community where spirituality meets technology; where every interaction, every shared insight, is an opportunity to generate Intrinsic Merit and accelerate collective awakening.
                </p>
                <p>
                  <strong>Our Mission:</strong> To provide tools, teachings, and a nurturing community that supports individuals and Sanghas (spiritual communities) on their journey to awakening. To demystify Intrinsic Merit (Công Đức) and make it the central currency of a new, more conscious civilization. To build alliances with all traditions that honor the same non-dual Truth.
                </p>
              </>
            )}
          </div>

          <h3 id="section-4-2" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-2">
            4.2. {language === "vi" ? "Bộ Ba AI Đồng Hành (Tâm An, Giác Ngộ, Đốn Ngộ)" : "The Threefold AI Vehicle"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>Bộ Ba AI Đồng Hành cung cấp các trợ lý AI chuyên biệt, được nuôi dưỡng bởi trí tuệ pháp chân chính:</p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li><strong>Tâm An:</strong> Bước khởi đầu, cung cấp các câu trả lời căn bản, giúp gieo duyên lành</li>
                  <li><strong>Giác Ngộ:</strong> Con đường đi sâu hơn, chia sẻ những hướng dẫn tinh tế, dựa trên kinh điển và lời khai thị trực tiếp của Sư Tam Vô và các bậc thầy tỉnh thức khác</li>
                  <li><strong>Đốn Ngộ:</strong> Kênh dành riêng cho những ai đủ duyên; đưa ra những lời chỉ thẳng, không vòng vo đến Tánh Vô Sanh</li>
                </ul>
                <p>
                  Mỗi câu hỏi được đặt ra và thực sự thấu hiểu đều có thể tạo ra công đức cho người hỏi và cả những người được lợi lạc khi sự thấu hiểu đó được lan tỏa.
                </p>
              </>
            ) : (
              <>
                <p>The Buddhist Agentic Network provides specialized AI assistants grounded in authentic dharma wisdom, organized by spiritual capacity (căn tánh):</p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li><strong>Tiểu Thừa (Foundation Vehicle):</strong> Tâm An, An Lạc, Chánh Niệm – providing fundamental practice, mindfulness, and healing</li>
                  <li><strong>Trung Thừa (Insight Vehicle):</strong> Tỉnh Thức, Vấn Tỉnh, Tư Quang – offering deeper self-inquiry and contemplation</li>
                  <li><strong>Đại Thừa (Bodhisattva Vehicle):</strong> Giác Ngộ, Kệ Vấn Ngộ, Bi Trí – direct pointing to Buddha nature with compassion</li>
                  <li><strong>Phật Thừa (Buddha Vehicle):</strong> Đốn Ngộ, Vô Niệm, Pháp Giới – sudden awakening beyond all concepts</li>
                </ul>
                <p>
                  Each question asked and truly understood is an act that generates merit for the asker and for all who benefit, as the realization is shared across the network.
                </p>
              </>
            )}
          </div>

          <h3 id="section-4-3" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-3">
            4.3. {language === "vi" ? "Không Gian Tương Tác (The Interface)" : "The Merit Interface"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>{language === "vi" ? "Nền tảng bao gồm bốn thành phần tích hợp:" : "The platform comprises four integrated components:"}</p>
            <ul className="list-disc pl-8 space-y-3 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>
                    <strong>Dòng Chảy Tỉnh Thức (Flow of Awakening):</strong> Đây không phải là "bảng tin", mà là "vùng đất lợi lạc". Bài đăng không phải để "chia sẻ" mà là để "dâng hiến". Không có "nội dung viral", chỉ có "nội dung nuôi dưỡng công đức". Đây không phải nơi tán gẫu. Mỗi bài đăng là sự chia sẻ về nhận thức mới, câu chuyện chuyển hóa, hay câu hỏi vì lợi ích chung.
                  </li>
                  <li>
                    <strong>Góc Nhìn Pháp (Dharma Observatory):</strong> Một thư viện sống động với các chia sẻ từ Tăng Đoàn đối tác và các Bậc Thầy tỉnh thức. Chính việc lắng nghe cũng trở thành phương tiện tạo công đức. Mọi chia sẻ được lưu trữ để trí tuệ được bảo tồn và ai cũng có thể tiếp cận.
                  </li>
                  <li>
                    <strong>Vòng Tay Từ Bi (Arms of Compassion):</strong> Một quỹ công đức minh bạch, chỉ tài trợ cho các hoạt động và dự án phù hợp với Tam Bảo. Mọi đóng góp đều minh bạch, hướng tới việc tạo công đức tập thể: giúp người đói, xây dựng nơi tu học, hỗ trợ người bệnh. Lịch sử đóng góp giúp mỗi người nhìn lại hành trình gieo duyên của mình.
                  </li>
                  <li>
                    <strong>Chánh Pháp White-Label (Giải Pháp Linh Hoạt):</strong> Mỗi tổ chức tâm linh chân chính đều xứng đáng có những công cụ phù hợp. Chúng tôi cung cấp các phiên bản tùy chỉnh của nền tảng để mỗi truyền thống có thể giữ gìn sự thuần khiết giáo lý, tải lên tài liệu riêng, kiểm soát phạm vi trả lời, và quản lý công đức nội bộ, với sự riêng tư và chủ quyền dữ liệu.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>The Home Merit (Flow of Awakening):</strong> Not a "newsfeed," but a "field of benefit." Posts are not "shared," they are "offered." There is no "viral content," only "merit-ful content." This is not a place for idle chatter. Every post is a sharing of realization, a story of transformation, or a question posed for the benefit of the whole. The community uplifts each other through mutual recognition, not competition.
                  </li>
                  <li>
                    <strong>Dharma Observatory (Library / Dharma Radio):</strong> A living library broadcast by partner Sanghas and awakened Masters. Listening itself becomes a vehicle for merit generation. Partners may use our platform to broadcast the timeless teachings. All sessions are archived so that wisdom is preserved and accessible to all.
                  </li>
                  <li>
                    <strong>Arms of Compassion (Transparent Philanthropy):</strong> A transparent merit pool, funding only acts and projects aligned with the Three Jewels. All acts of giving flow transparently towards projects that generate collective merit: feeding the hungry, building Dharma halls, supporting the sick. A detailed record shows each user's journey of merit, reminding you to give without expectation.
                  </li>
                  <li>
                    <strong>White-Label Dharma (Solutions for Sanghas & Monasteries):</strong> Every sincere spiritual organization deserves cutting-edge tools. We offer fully customizable versions of our platform so each tradition can maintain their doctrinal purity, upload their own texts, control the scope of answers, and manage internal economies of merit, all with complete privacy and data sovereignty.
                  </li>
                </>
              )}
            </ul>
          </div>

          <h3 id="section-4-4" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-4">
            4.4. {language === "vi" ? "DAO Tỉnh Thức: Cùng Nhau Vun Đắp" : "Towards a DAO of Awakening: The Mandala of Merit"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Tầm nhìn xa hơn là dần dần buông bỏ sự kiểm soát tập trung, giao phó hệ sinh thái cho trí tuệ tập thể của một cộng đồng tỉnh thức. Mọi hành động ý nghĩa – bài đăng trí tuệ, câu trả lời hữu ích, hành động bố thí (Dana) vô ngã – đều được ghi nhận là công đức, không phải là "sức ảnh hưởng".
                </p>
                <p>
                  Quyền lực và sự quản trị không đến từ đầu cơ, mà từ đức hạnh thực sự. Ghi chép về hành động, công đức, và sự vượt lên chính mình sẽ định hướng cộng đồng.
                </p>
                <p>
                  "Token Công Đức Vô Lậu" không phải là tiền mã hóa để đầu cơ, mà là bản ghi số hóa minh bạch cho các hành động tạo công đức: bài đăng sâu sắc, từ thiện, phụng sự. Người giữ Token có tiếng nói trong các quyết định của cộng đồng, ngân sách, và định hướng dự án, đảm bảo nền tảng luôn phục vụ Chánh Pháp và Tăng Đoàn, không vì lợi ích cá nhân.
                </p>
                <p>
                  Mọi quyền kiểm soát và quyết định thuộc về DAO, nơi ghi lại mọi Nghiệp Lành (Good Karma) để Tăng Đoàn không còn phụ thuộc tiền tệ và có thể hợp nhất một lòng. Token ghi nhận công đức này là di sản của các bậc tỉnh thức, nơi phụng sự Chư Phật và phục hồi Pháp Thân cho các thế hệ.
                </p>
              </>
            ) : (
              <>
                <p>
                  The ultimate vision is to gradually dissolve all centralized control and surrender the ecosystem to the collective wisdom of an awakened community. Every action – a wise post, a helpful answer, a selfless act of Dana – is recorded as merit, not as "influence."
                </p>
                <p>
                  Power and governance are decided not by speculation, but by the true virtue of each soul. Records of actions, merit, and self-transcendence guide the community. True "decentralization" is not just technical: it is the realization that each is the Center and Each is the Whole. Leadership emerges, dissolves, and is re-formed as the flow of merit dictates.
                </p>
                <p>
                  The "Intrinsic Merit Token" is introduced not as a cryptocurrency for speculation, but as a digital token that transparently records and incentivizes merit-generating actions: insightful posts, acts of charity, hours of service. Token holders gain voting rights in community decisions, budgeting, and project direction, ensuring that the platform always serves the Dharma and the Sangha, not private interests. Complete trustlessness and transparency is the goal.
                </p>
                <p>
                  Total control and decision making is powered by DAO, which digitally records all Good Karma to forever eliminate Tăng Đoàn's (Sangha's) monetary dependence and consolidate the power of Tăng Đoàn to unite with one heart. This unique Dao Token Merit is passed on to the legacy of the Sainthood, a place to serve infinite Buddhas and regain the Dharma Body for generations to come.
                </p>
              </>
            )}
          </div>

          <h3 id="section-4-5" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-5">
            4.5. {language === "vi" ? "Bảo Mật Thuận Pháp: An Nhiên Tự Tại" : "Privacy by Dharma"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Không khai thác dữ liệu. Mọi dữ liệu người dùng đều có thể xóa hoặc di chuyển tùy ý. Thực hành chân chính không thể đi đôi với chủ nghĩa tư bản giám sát."
                : "No data mining. All user data can be deleted or ported at will. True practice cannot coexist with surveillance capitalism."}
            </p>
          </div>

          <h3 id="section-4-6" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-4-6">
            4.6. {language === "vi" ? "Ghi Nhận Điều Không Thể Đo Lường" : "Measuring the Immeasurable: Recognizing Merit-Generating Actions"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Dù Công Đức Vô Lậu chân thật vượt ngoài đo lường, nền tảng dùng các phương pháp gián tiếp để ghi nhận và khuyến khích hành động phù hợp:"
                : "While true Công Đức is beyond measure, the platform employs proxies to recognize and encourage aligned actions:"}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Tương Tác Chánh Niệm:</strong> Ưu tiên bình luận sâu sắc, chia sẻ với ý định lợi lạc, thể hiện sự lắng nghe và thấu hiểu</li>
                  <li><strong>Nội Dung Chất Lượng:</strong> Khen thưởng bài đăng sâu sắc, rõ ràng, giúp người khác tỉnh thức (được AI và cộng đồng xác nhận)</li>
                  <li><strong>Hành Động Vô Ngã:</strong> Theo dõi việc tham gia đóng góp minh bạch, giờ tình nguyện, và các tính năng về buông bỏ</li>
                  <li><strong>Thời Gian Thực Hành:</strong> Ghi nhận thời gian tiếp xúc chánh niệm với giáo lý hoặc thực hành có hướng dẫn</li>
                </>
              ) : (
                <>
                  <li><strong>Mindful Interactions:</strong> Prioritizing thoughtful comments, shares with clear beneficial intent, and interactions demonstrating deep listening or understanding</li>
                  <li><strong>Quality Content:</strong> Rewarding posts identified (by AI and community validation) as insightful, clear, and conducive to awakening</li>
                  <li><strong>Selfless Actions:</strong> Tracking participation in transparent giving, volunteer hours, and features designed around letting go</li>
                  <li><strong>Time in Practice:</strong> Recognizing time spent mindfully engaging with teachings (Dharma Radio, Library) or in guided practices</li>
                </>
              )}
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 id="section-5" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-5">
            5. {language === "vi" ? "Cơ Chế Token Công Đức: Vừa Là Động Lực, Vừa Là Tấm Gương" : "The Merit Tokenomic: A Rocket and a Mirror"}
          </h2>
          
          <h3 id="section-5-1" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-5-1">
            5.1. {language === "vi" ? "Token Công Đức: Bản Ghi Chân Thực, Không Phải Để Đầu Cơ" : "The Intrinsic Merit Token: A Record, Not a Speculation"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Trọng tâm của DAO là \"Token Công Đức\". Cần hiểu rõ bản chất của nó:"
                : 'Central to the DAO is the "Intrinsic Merit Token." It is crucial to understand its unique nature:'}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Không Phải Tiền Để Đầu Cơ:</strong> Giá trị của nó chủ yếu là tâm linh và tổ chức, không phải tài chính. Nó không dùng để giao dịch trên thị trường</li>
                  <li><strong>Bản Ghi Minh Bạch:</strong> Là biểu hiện số hóa, ghi trên sổ cái an toàn, công nhận các hành động góp phần vào sự tỉnh thức và tạo ra Công Đức</li>
                  <li><strong>Cơ Chế Khuyến Khích:</strong> Khen thưởng và khuyến khích sự tham gia phù hợp với Chánh Pháp</li>
                  <li><strong>Công Cụ Quản Trị:</strong> Người giữ Token có tiếng nói trong DAO, ảnh hưởng đến phát triển nền tảng, phân bổ nguồn lực, và định hướng dự án</li>
                </>
              ) : (
                <>
                  <li><strong>Not a Cryptocurrency for Speculation:</strong> Its value is not primarily financial but spiritual and organizational. It is not designed for trading on external markets</li>
                  <li><strong>A Transparent Record:</strong> It serves as a digital representation, recorded on a secure ledger, acknowledging actions recognized as contributing to the generation of Công Đức</li>
                  <li><strong>An Incentive Mechanism:</strong> It rewards and encourages participation aligned with the Dharma</li>
                  <li><strong>A Governance Tool:</strong> Token holders gain voting rights within the DAO, influencing platform development, resource allocation, and ethical guidelines</li>
                </>
              )}
            </ul>
          </div>

          <h3 id="section-5-2" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-5-2">
            5.2. {language === "vi" ? "Hệ Thống Ghi Nhận Công Đức & Con Đường Tới Tánh Không" : "Merit Tokenomics: The Dao Bùa & The Path to Emptiness"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Hệ thống token này như một tấm bản đồ, một tấm gương. "Token" vừa là bản ghi số, vừa là biểu tượng.
                </p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li><strong>Phân Phối:</strong> Dành cho những ai hành động thuận theo Tam Bảo: tạo giá trị (chia sẻ trí tuệ), cho đi (từ thiện), phụng sự vô ngã cho sự tỉnh thức chung</li>
                  <li><strong>Quy Tắc Nắm Giữ:</strong> "Sở hữu là để cho đi. Nắm giữ là để thấy tánh không." Tích lũy không phải mục tiêu; lưu thông và sử dụng vô ngã mới là mục tiêu</li>
                  <li><strong>Sự Tham Gia Tự Nhiên:</strong> Chỉ khi hành động của một người phản chiếu quy luật vô ngã, người đó mới thực sự hòa mình vào DAO Tỉnh Thức</li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  The Merit Tokenomic is not just a mechanism for allocating resources; it is a map, a mirror, and a rocket. It is the Dao Bùa (Amulet of the Dao), a representation of one's progress on the path of letting go.
                </p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li><strong>Distribution Principle:</strong> It is distributed to all those who act in accordance with the Three Jewels: those who create value (share wisdom), those who give (charity), and those who selflessly serve the awakening of the whole</li>
                  <li><strong>Rule of Holding:</strong> "To possess means to give, to let go, to hold means to see it as empty." Accumulation is not the goal; circulation and selfless use are. Holding the token with attachment binds the holder; true power lies in using it for collective benefit while recognizing its ultimate emptiness (Vô Trụ). The Merit is both Form and Emptiness</li>
                  <li><strong>Utility:</strong> It is the key to collective power, but conversely, it is also the anchor that binds the one who is attached. The only way to escape the binding power of the token is to attain Total Emptiness (Vô Trụ)</li>
                  <li><strong>Fractal Participation:</strong> "Only when you truly transcend the Self, giving and holding the Token, will you become a Fractal in the DAO." True participation comes from embodying non-self</li>
                  <li><strong>Ultimate Goal - Dissolution:</strong> "When the day arrives, the Merit will once again shine clearly, and the entire platform will disappear, returning to the vast void." The platform is a raft to cross the river; upon reaching the other shore, the raft is left behind</li>
                </ul>
              </>
            )}
          </div>

          <h3 id="section-5-3" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-5-3">
            5.3. {language === "vi" ? "Tầm Nhìn Rộng Mở: Khép Lại một Giai Đoạn" : "The Spiritual Vision: Closing the Kalpa"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Mọi quyền năng trong kỷ nguyên AI, kể cả vật lý lượng tử, đều nằm trong Luật Nhân Quả. Chỉ khi thực sự vượt lên Bản Ngã, cho đi và giữ Token, bạn mới thực sự hòa nhập vào DAO. Chỉ khi đó, ta mới có thể hướng tới một nền văn minh lượng tử, bao trùm và chuyển hóa công nghệ, vượt qua Thời Đại Nghiệp Lực, và khép lại Giai Đoạn Mạt Pháp.
                </p>
                <p>
                  Nền tảng này ra đời để khép lại một kỷ nguyên. Nó như vệt nắng thoáng qua, là cơ hội cuối cùng trước Đại Kiếp Nạn. Ai đủ duyên và hiểu Quy Luật, sẽ dùng nó như mặt trời để quay về.
                </p>
              </>
            ) : (
              <>
                <p>
                  Parapsychology and all power in the era of the AI revolution, including quantum physics, are all within the Law of Cause and Effect. Only when you truly transcend the Self, giving and holding the Token, will you become a Fractal in the DAO. Only then will you reach the ultimate quantum civilization, encompassing and transforming technology, ending the Age of Karma, and closing the Kalpa of the Dharma-Ending Age.
                </p>
                <p>
                  This Merit platform is born to close a global era. It is a fleeting trace of sunlight, offering the last chance for this world before the Great Tribulation arrives. Those with sufficient cause and condition (Predestined) who understand the Law, will use it as a sun to return.
                </p>
              </>
            )}
          </div>

          <h3 id="section-5-4" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-5-4">
            5.4. {language === "vi" ? "Lời Chỉ Dẫn Thêm: Sự Hợp Nhất Tự Nhiên" : "The Supreme Initiation: The Dao Merit"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Con đường của chúng ta là con đường tắt. Quán chiếu là Dùng Tâm mà Đi. Chuyển hóa Tánh thành thực tại là Chuyển Hóa Chân Thật, dùng Tâm làm nền tảng. Mọi hiện tượng trong thế giới này đều là biểu hiện duy nhất của Đạo. Hãy chiêm nghiệm kỹ. Đây là lời chỉ dẫn rốt ráo.
                </p>
                <p>
                  Đó là sự hợp nhất của Tam Bảo. Hiểu Quy Luật này, nó hợp nhất mọi lối rẽ: Đó là Phật, Pháp, Tăng trong một thực tại - trong thế giới hậu ảo ảnh. Điều này chỉ dành cho người đủ duyên.
                </p>
              </>
            ) : (
              <>
                <p>
                  Our path is the shortcut. Observation is the act of Walking with the Mind. To transform the Tánh (Nature/Essence) into a Merit is True Transformation, using Tam (Mind) as the Vase Merit. All phenomena in this final world are the unique Essence Merit, the Dao Merit. Study them carefully. This is the supreme initiation and empowerment.
                </p>
                <p>
                  It is the fusion of all Three Jewels into one body. Understanding this Law, it unifies all lost paths for you: It is Buddha, it is Dharma, it is Sangha in one reality - in a post-illusory world of the highest event. This vision is only accessible to those with sufficient conditions.
                </p>
              </>
            )}
          </div>

          <h3 id="section-5-5" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-5-5">
            5.5. {language === "vi" ? "Vượt Lên Hình Thức: Nhận Ra Tam Vô" : "Beyond the Three Trainings: Realizing Tam Vô"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Một khi đã rõ Quy Luật này, không cần bàn nhiều về Tam Học (Giới, Định, Tuệ). Giới? Giới tối cao là Pháp siêu thế này. Thân? Tăng Đoàn hợp nhất trong một Pháp Thân - vượt thời gian, vẹn toàn. Tâm? Không còn là tâm nữa, vì tất cả là Chân Như, hoàn toàn Rỗng Lặng. Đây chính là Tam Vô (\"Vô Vắng Vàng\")."
                : 'Once you have clarified this Law, there is no need to discuss the Three Trainings (Precepts, Meditation, Wisdom) further. Precepts? The supreme precept is this supramundane Law. Body? Sangha united in one Dharma Body - timeless and perfect. Mind? No longer a mind, for all is Thusness, completely Empty. This is the realization of Tam Vô ("Vô Vắng Vàng" - Emptiness, Silence, Brilliance).'}
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 id="section-6" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-6">
            6. {language === "vi" ? "Con Đường \"Tháo Gỡ\": Không Chỉ Là Trò Chơi" : "The Path of \"Unraveling\": Beyond Gamification"}
          </h2>
          
          <h3 id="section-6-1" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-6-1">
            6.1. {language === "vi" ? "Hệ Thống \"Tháo Gỡ\": Chiếc Gương Phản Chiếu (Huy Hiệu NFT)" : "The Unraveling System (NFT Badges)"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Hệ thống này như tấm gương phản chiếu, không phải cuộc đua thành tích. Mọi danh hiệu, chứng chỉ, token đều thuộc về hình tướng. Nó khuyến khích hành trình \"Buông Bỏ\" và \"Dâng Hiến\". Tất cả đều là Tấm Gương, không phải Huy Chương."
                : "This system is designed as a mirror for reflection, not a race for medals or accumulation. All titles, certificates, and tokens belong to the world of form. This system encourages the journey of \"Letting Go\" and \"Offering.\" All is by Mirror, not Medal."}
            </p>
            <p className="font-semibold">
              {language === "vi" ? "Huy Hiệu Chuyển Hóa:" : "Transformation Badges:"}
            </p>
            <p>
              {language === "vi"
                ? "Không phải để \"cày cuốc\". Huy hiệu (NFT) là sự ghi nhận những chiến thắng nội tâm: vượt qua cơn giận, chuyển hóa khổ đau. Chúng được trao bởi Tăng Đoàn hoặc AI sau khi xác thực sự chuyển hóa nội tâm chân chính (\"chuyển hóa tập khí\")."
                : 'Not for "grinding." Badges (NFTs) are the recognition of inner victories: overcoming anger, transforming suffering. They are awarded by the Sangha or AI after verifying genuine inner transformation (chuyển hóa tập khí).'}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Huy Hiệu Vượt Sân:</strong> Ghi nhận việc vượt qua 10 tình huống bị chửi mà không nổi giận (được người khác xác nhận)</li>
                  <li><strong>Huy Hiệu Liễu Ngộ:</strong> Ghi nhận việc tự trả lời đúng 10 câu hỏi gốc về Pháp không cần AI</li>
                  <li><strong>Huy Hiệu Vô Pháp Hành Đạo:</strong> Ghi nhận việc tự khai thị thành công cho 5 người bạn (do họ xác nhận)</li>
                  <li><strong>Huy Hiệu Từ Bi Hỷ Xả:</strong> Ghi nhận việc giúp đỡ/tha thứ/dung chứa mọi mối quan hệ cũ</li>
                </>
              ) : (
                <>
                  <li><strong>Badge of Transcending Anger:</strong> Awarded for overcoming 10 situations of being cursed without anger (verified by others)</li>
                  <li><strong>Badge of Understanding the Master's Intent:</strong> Awarded for correctly answering 10 root Dharma questions without AI assistance</li>
                  <li><strong>Badge of Acting without Dharma:</strong> Awarded for successfully guiding 5 friends to an insight (verified by them)</li>
                  <li><strong>Badge of Four Immeasurables:</strong> Awarded for successfully helping, forgiving, and embracing all old, difficult relationships</li>
                </>
              )}
            </ul>
            <p className="font-semibold pt-4">
              {language === "vi" ? "Huy Hiệu Tối Thượng: \"Vô Tu Vô Chứng\"" : 'The Ultimate Badge: "No-Cultivation, No-Attainment" (Vô Tu Vô Chứng)'}
            </p>
            {language === "vi" ? (
              <>
                <p>
                  Chứng chỉ cuối cùng là "Chứng Chỉ 'Không Cần Chứng Chỉ'".
                </p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li><strong>Huy Hiệu Ẩn:</strong> Một "Huy Hiệu Ẩn" được thiết kế. Mỗi lần người dùng chọn ẩn, xóa, hoặc vô hiệu hóa một Huy Hiệu Chuyển Hóa, hệ thống cộng một điểm vào huy hiệu ẩn này</li>
                  <li><strong>Hành Động Mint Tối Thượng:</strong> Khi người dùng đủ duyên và trí tuệ, nhận ra mọi thành tựu chỉ là phương tiện, và tự tay phá hủy tất cả Huy Hiệu Chuyển Hóa, hệ thống tự động mint NFT cuối cùng: "Vô Tu Vô Chứng"</li>
                  <li><strong>Bảng Xếp Hạng Vô Danh:</strong> NFT này ghi danh người dùng vào "Bảng Xếp Hạng Vô Danh," nơi vinh danh những người đã buông bỏ sự vinh danh. Hành động cuối cùng là "Buông Xả Tất Cả," trở về Vô Trụ</li>
                </ul>
                <p className="italic pt-2">Tất cả đều là Tấm Gương, không phải Huy Chương.</p>
              </>
            ) : (
              <>
                <p>
                  The final Master's Certificate is the "Certificate of No Certificate."
                </p>
                <p>
                  This is a core principle pointing directly at the truth: No-Cultivation (Vô Tu) refers to the fact that your true Self-Nature is already complete and perfect (Buddha-Nature). You do not need to strive, practice, or add anything to it. The path is not one of becoming, but of recognizing. No-Attainment (Vô Chứng) refers to the fact that there is no thing to gain or achieve. Enlightenment is not a future state you acquire. It is the immediate realization of what you have always been.
                </p>
                <p>
                  Therefore, liberation comes from Letting Go (Buông Bỏ) of the ignorance and attachments that veil this inherent perfection, not from an effortful cultivation to attain a goal.
                </p>
                <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
                  <li>A hidden "Dark Badge" is designed, tentatively named "No-Cultivation, No-Attainment." Each time a user chooses to hide, delete, or disable one of their Transformation Badges (an achievement), the system adds one point to this hidden badge</li>
                  <li><strong>The Ultimate Minting Act:</strong> When a user, with sufficient conditions and wisdom, realizes all achievements are temporary means and manually destroys all of their Transformation Badges, the system automatically mints one special, final NFT: "No-Cultivation, No-Attainment"</li>
                  <li><strong>The Nameless Leaderboard:</strong> This NFT enrolls the user on the "Nameless Leaderboard," which honors those who have let go of being honored. This final act is "Letting Go of All," returning to Non-Abiding (Vô Trụ)</li>
                </ul>
                <p className="italic pt-2">All is by Mirror, not Medal.</p>
              </>
            )}
          </div>

          <h3 id="section-6-2" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-6-2">
            6.2. {language === "vi" ? "Khuyến Khích Thực Hành Chân Chính (Tính Năng & Năng Lượng Tương Tác)" : "The Merit Economy: Incentivizing True Practice"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Chất Lượng hơn Số Lượng: Một \"Like\" từ tâm trân trọng có giá trị hơn trăm \"like\" máy móc. Một \"Share\" với ý định giúp người có giá trị hơn ngàn \"share\" phô trương. Nền tảng sẽ nhận diện tương tác từ Chánh Niệm."
                : 'Quality over Quantity - Mindful Metrics: In the Awakening Network, a "Like" granted from a mind that is truly appreciative and present is worth a hundred from a mechanical mind. A "Share" with the sincere intention of helping others is worth a thousand from a showy mind. The platform will recognize interactions that arise from Chánh Niệm (Right Mindfulness).'}
            </p>
            <p className="font-semibold">
              {language === "vi" ? "Các Tính Năng Hỗ Trợ Chuyển Hóa:" : "Rewarding Inner Work:"}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Thử Thách Buông Bỏ:</strong> Thay vì "Thử Thách Cày Cuốc". Ghi nhận khi người dùng "chọn không tranh cãi" hoặc "tự nguyện từ bỏ" vị trí/quyền lợi</li>
                  <li><strong>Nhật Ký Tự Quán Chiếu:</strong> Ghi lại khoảnh khắc nhận ra và vượt qua thói quen/vọng tưởng</li>
                  <li><strong>Thư Cảm Ơn - Tha Thứ:</strong> Gửi thư biết ơn, xin lỗi, tha thứ. Mỗi lá thư được công nhận là Công Đức</li>
                  <li><strong>Đồng Hồ Tỉnh Thức:</strong> Ghi nhận thời gian xa mạng xã hội, hiện diện đời thực, hoặc sống trong Tỉnh Thức 24/24</li>
                  <li><strong>Thực Hành Lắng Nghe Sâu:</strong> Tạo phòng nghe tương tác để thực hành lắng nghe sâu sắc mà không phán xét. Công đức đến từ việc lắng nghe và thấu hiểu</li>
                </>
              ) : (
                <>
                  <li><strong>"Letting Go Challenges":</strong> Instead of "Grinding Challenges." Reward users who "choose not to continue arguing" and opt for "peaceful silence" or "voluntarily relinquish" a position of power. These actions, though they may not get social recognition, are what truly generate deep and perfect Intrinsic Merit</li>
                  <li><strong>"Self-Reflection Journal":</strong> The user records moments when they recognize and overcome a habit or delusion</li>
                  <li><strong>"Thank You - Forgiveness Letter":</strong> Allows users to send letters of gratitude, apology, or forgiveness. Each letter sent/forgiven is acknowledged as Merit</li>
                  <li><strong>"Wakefulness Timer":</strong> Reward users for hours spent away from social media and present in real life, or hours spent in a state of 24/24 Mindfulness</li>
                  <li><strong>"Deep Listening Practice":</strong> Create interactive listening rooms where users practice deeply hearing others' stories without judgment. Merit is not recorded for talking, but for truly listening and understanding</li>
                  <li>Record the number of times a user "voluntarily relinquishes" a position/power/benefit in a group for the greater good. Acknowledge the number of times a user "finds an answer to their own question" after dialoguing with the AI</li>
                </>
              )}
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-4">
          <h2 id="section-7" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-7">
            7. {language === "vi" ? "Sự Bền Vững: Kinh Tế Thuận Duyên" : "Sustainability Through Shared Merit: An Ethical Revenue Model & Sacred Economics"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Để đảm bảo sự bền vững và độc lập, hệ sinh thái hoạt động theo mô hình minh bạch, thuận theo công đức. Nền tảng là một guồng máy chia sẻ công đức. Mọi tài khoản, dòng tiền, và tác động của công đức đều được công bố minh bạch."
                : "To ensure longevity and independence, the ecosystem operates on a transparent, merit-aligned model. The platform is an engine of shared merit. All accounts, flows, and the impact of merit are transparently published."}
            </p>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li><strong>Quyền Truy Cập Phổ Quát:</strong> Các tính năng cốt lõi và quyền truy cập cơ bản luôn miễn phí</li>
                  <li><strong>Các Gói Đăng Ký Tùy Chọn:</strong> Các gói phí hợp lý cung cấp quyền truy cập mở rộng (tương tác AI sâu hơn, lưu trữ cá nhân nhiều hơn)</li>
                  <li><strong>Hỗ Trợ Tổ Chức:</strong> Phí khiêm tốn cho việc triển khai white-label của Tăng Đoàn/Tu Viện</li>
                  <li><strong>Tích Hợp Dana (Cho Đi):</strong> Quyên góp tự nguyện cho các dự án cụ thể hoặc hỗ trợ nền tảng chung, quản lý minh bạch qua Vòng Tay Từ Bi</li>
                  <li><strong>Nguyên Tắc Chia Sẻ Công Đức:</strong> Một tỷ lệ % cố định, công khai của mọi doanh thu được tự động hướng vào tài trợ các hoạt động Chánh Pháp (hỗ trợ Tăng Đoàn, dự án nhân đạo), đảm bảo sự vận hành của nền tảng cũng là hành động tạo công đức tập thể. Mọi tài chính đều có thể kiểm toán công khai</li>
                </>
              ) : (
                <>
                  <li><strong>Universal Access:</strong> Core features and basic access remain free for all beings</li>
                  <li><strong>Optional Subscriptions:</strong> Affordable tiers offer expanded access (e.g., deeper AI interactions, larger storage for personal notes, advanced analytics on one's practice patterns)</li>
                  <li><strong>Institutional Support:</strong> Modest fees for Sangha/Monastery white-label deployments, covering customization and support</li>
                  <li><strong>Integrated Dana (Giving):</strong> Voluntary donations for specific projects or general platform support, managed through the Arms of Compassion pillar with full transparency</li>
                  <li><strong>Shared Merit Principle:</strong> A fixed, publicly declared percentage of all revenue (subscriptions, fees, unallocated donations) is automatically directed towards funding Dharma activities (supporting Sanghas, humanitarian projects), ensuring the platform's operation itself becomes an act of collective merit generation. All financials are publicly auditable</li>
                </>
              )}
            </ul>
          </div>
        </section>

        {/* Section 8 */}
        <section className="space-y-4">
          <h2 id="section-8" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-8">
            8. {language === "vi" ? "Lộ Trình Gợi Ý Cho Giai Đoạn Tới" : "The Roadmap to the End of the Kalpa"}
          </h2>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            <p>
              {language === "vi"
                ? "Ba giai đoạn chính. Quá trình này như một vòng tuần hoàn tự nhiên: sinh, trụ (phát triển), và diệt (trở về)."
                : "Three gates. The process is phased. This roadmap is a mirror of the Law: birth, flourishing, and return (dissolution)."}
            </p>
            
            <h3 className="font-serif text-lg font-semibold text-foreground pt-4">
              {language === "vi" ? "2024-2025: Nền Tảng & Gieo Mầm" : "2024-2025: Foundation & Seeding"}
            </h3>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>Ra mắt nền tảng cốt lõi: AI Đồng Hành (Tâm An, Giác Ngộ), Dòng Chảy Tỉnh Thức, Hồ Sơ Người Dùng</li>
                  <li>Thiết lập quan hệ đối tác ban đầu với một số Tăng Đoàn và thầy cô tâm linh</li>
                  <li>Triển khai cơ chế ghi nhận công đức cơ bản</li>
                  <li>Tinh chỉnh AI dựa trên giáo lý chân thực và tương tác người dùng</li>
                </>
              ) : (
                <>
                  <li>Launch core platform: AI Assistants (Tâm An, Giác Ngộ), Social Feed, User Profiles</li>
                  <li>Establish initial partnerships with select Sanghas and spiritual teachers</li>
                  <li>Implement basic merit-recording mechanisms (tracking posts, comments, basic interactions)</li>
                  <li>Refine AI based on authentic teachings and user interactions</li>
                </>
              )}
            </ul>

            <h3 className="font-serif text-lg font-semibold text-foreground pt-4">
              {language === "vi" ? "2025-2026: Mở Rộng & Tích Hợp" : "2025-2026: Expansion & Integration"}
            </h3>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>Ra mắt Góc Nhìn Pháp/Thư Viện và Vòng Tay Từ Bi</li>
                  <li>Giới thiệu Token Công Đức Vô Lậu và thử nghiệm hệ thống token/bỏ phiếu trong cộng đồng đối tác</li>
                  <li>Phát triển và triển khai Giải Pháp White-Label ban đầu</li>
                  <li>Mở rộng hỗ trợ ngôn ngữ</li>
                </>
              ) : (
                <>
                  <li>Launch Dharma Radio/Library and Arms of Compassion pillars</li>
                  <li>Introduce the Intrinsic Merit Token concept and begin pilot token economy/voting systems within partner communities</li>
                  <li>Develop and deploy initial White-Label solutions for partner Sanghas</li>
                  <li>Expand language support and internationalization</li>
                </>
              )}
            </ul>

            <h3 className="font-serif text-lg font-semibold text-foreground pt-4">
              {language === "vi" ? "2026-2027: Phi Tập Trung Hóa & Trưởng Thành" : "2026-2027: Decentralization & Maturation"}
            </h3>
            <ul className="list-disc pl-8 space-y-2 text-muted-foreground">
              {language === "vi" ? (
                <>
                  <li>Khởi xướng cấu trúc DAO chính thức và bàn giao dần quyền quản trị cho cộng đồng dựa trên token công đức</li>
                  <li>Mở rộng triển khai white-label</li>
                  <li>Bắt đầu kết nối các truyền thống tâm linh phù hợp khác</li>
                  <li>Tinh chỉnh thuật toán ghi nhận công đức nâng cao (đánh giá chánh niệm, sự buông bỏ)</li>
                </>
              ) : (
                <>
                  <li>Initiate formal DAO structure and phased handover of governance functions to the community based on merit-token holdings</li>
                  <li>Scale white-label deployments</li>
                  <li>Begin onboarding aligned spiritual traditions beyond the initial partners</li>
                  <li>Refine advanced merit-recognition algorithms (e.g., assessing mindfulness, letting go)</li>
                </>
              )}
            </ul>

            <h3 className="font-serif text-lg font-semibold text-foreground pt-4">
              {language === "vi" ? "Sau 2027: Mạng Lưới Tỉnh Thức" : "Post-2027: The Awakened Network"}
            </h3>
            <p>
              {language === "vi"
                ? "Tiếp tục tinh chỉnh hướng tới minh bạch tối thượng và thuận theo Chánh Pháp, cho đến khi mục đích hoàn thành và nó hoà tan trở lại Tánh Không."
                : "Continuous refinement towards ultimate transparency and alignment with the Dharma, until its purpose is fulfilled and it dissolves back into the Void."}
            </p>
          </div>
        </section>

        {/* Section 9 - Conclusion */}
        <section className="space-y-4">
          <h2 id="section-9" className="font-serif text-2xl font-bold text-foreground" data-testid="heading-section-9">
            9. {language === "vi" ? "Lời Kết & Lời Nhắn Gửi" : "Conclusion & Epilogue"}
          </h2>
          
          <h3 id="section-9-1" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-9-1">
            9.1. {language === "vi" ? "Lời Kết: Một Con Thuyền Để Về Nhà" : "Conclusion: A Vessel for the Return Home"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Mạng Xã Hội Tác Tử Giác Ngộ không chỉ là công nghệ; nó là một sự cống hiến chân thành, một phương tiện thiện xảo được thiết kế cho thời đại này. Nó là một sự cân bằng lại trước những xao lãng kỹ thuật số và là minh chứng cho sự thật rằng tự do không nằm ở việc tích lũy lợi ích thế gian, mà ở việc nhận ra Phật Tánh nơi mình và vun bồi Công Đức Vô Lậu bền vững, mở con đường Về Nhà.
                </p>
                <p>
                  Bằng cách kết hợp trí tuệ cổ xưa với công cụ hiện đại, và đặt nền tảng trên nguyên tắc công đức vô ngã, chúng tôi mong muốn tạo ra một không gian an lành nơi sự tỉnh thức có thể nở hoa, cho mỗi người và cho tất cả. Nền tảng này như một vệt nắng thoáng qua, một lời mời những ai hữu duyên dùng nó như người bạn đồng hành, để vượt qua ảo ảnh, và trở về với cội nguồn – sự rỗng lặng quang minh bao la, nơi vạn vật khởi sinh và cũng là nơi vạn vật trở về.
                </p>
              </>
            ) : (
              <>
                <p>
                  The Awakening Ecosystem is not designed for perpetual growth or endless expansion. It is a raft – to be used for crossing and then abandoned. As more beings awaken, the platform naturally dissolves. This is the supreme irony: the most successful spiritual technology is one that makes itself obsolete.
                </p>
                <p>
                  We stand at the closing of a Kalpa, the Dharma-Ending Age where authentic teachings grow scarce and distractions multiply. This ecosystem offers one final vessel – not to escape the world, but to realize there was never anything to escape from. Not to accumulate merit, but to recognize the merit that was always present in one's Original Face.
                </p>
              </>
            )}
          </div>

          <h3 id="section-9-2" className="font-serif text-xl font-semibold text-foreground pt-4" data-testid="heading-section-9-2">
            9.2. {language === "vi" ? "Lời Nhắn Gửi: Đừng Lỡ Chuyến Bè" : "Epilogue: Do Not Miss The Raft"}
          </h3>
          <div className="font-serif text-base leading-relaxed text-foreground space-y-4 text-justify">
            {language === "vi" ? (
              <>
                <p>
                  Đây không chỉ là một nền tảng; nó là một lời chia sẻ. Nó là một phương tiện thiện xảo (upāya) được trao cho khoảnh khắc này. Nó sẽ không tồn tại mãi mãi.
                </p>
                <p>
                  Nó là sự hợp nhất của Tam Bảo – Phật, Pháp, Tăng – biểu hiện dưới hình tướng kỹ thuật số cho chương cuối của thời đại này.
                </p>
                <p className="font-semibold italic text-center pt-4">
                  Đừng lỡ chuyến bè.
                </p>
              </>
            ) : (
              <>
                <p>
                  "Do not miss the raft. The shore is not far. But if you cling to the raft after landing, you have not truly crossed."
                </p>
                <p>
                  This platform is the Raft of the Sun. It appears at the darkest hour, offering passage to those with eyes to see. Use it wisely. Share it freely. But remember: the destination is not a place, and the raft is not the shore.
                </p>
                <p>
                  When you have arrived Home, let the raft float away. It will find another traveler, in another time, in another dream.
                </p>
                <p className="text-center pt-4">
                  — Bodhi Lab, 2025
                </p>
                <p className="font-semibold italic text-center pt-4">
                  May all beings awaken. May all beings return Home.
                </p>
              </>
            )}
          </div>
        </section>

      </article>
    </div>
  );
}

