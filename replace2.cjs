const fs = require('fs');
let code = fs.readFileSync('client/src/components/social/SocialFeed.tsx', 'utf8');

code = code.replace(
    /const diff = Date\.now\(\) - new Date\(dateStr\)\.getTime\(\);\s+const s = Math\.floor\(diff \/ 1000\);\s+if \(s < 60\) return 'Vừa xong';[\s\S]*?return `\$\{Math\.floor\(mo \/ 12\)\} năm trước`;/,
    `const t = translations[lang];
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return t.justNow;
    const m = Math.floor(s / 60);
    if (m < 60) return \`\${m} \${t.minutesAgo}\`;
    const h = Math.floor(m / 60);
    if (h < 24) return \`\${h} \${t.hoursAgo}\`;
    const d = Math.floor(h / 24);
    if (d < 30) return \`\${d} \${t.daysAgo}\`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return \`\${mo} \${t.monthsAgo}\`;
    return \`\${Math.floor(mo / 12)} \${t.yearsAgo}\`;`
);

fs.writeFileSync('client/src/components/social/SocialFeed.tsx', code);
