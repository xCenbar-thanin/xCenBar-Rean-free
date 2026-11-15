/* xCenBar Bot — smart lesson search (offline) + internet search shortcuts */
(function () {
  "use strict";
  var IDX = window.XC_AI_INDEX || { s: [], v: [] }, CAT = window.XC_CATALOG || { courses: [] };
  var BY = {}; CAT.courses.forEach(function (c) { BY[c.id] = c; });
  function icon(id) { return (window.XC_ICONS && window.XC_ICONS[id]) || ("assets" + "/icons/" + id + ".svg"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var KH = "០១២៣៤៥៦៧៨៩";
  function norm(s) {
    return String(s).toLowerCase().normalize("NFKC")
      .replace(/[០-៩]/g, function (d) { return String(KH.indexOf(d)); })
      .replace(/[·•›»«“”"'’(),.:;!?？！，。、|/\\\-–—_[\]{}]+/g, " ").replace(/\s+/g, " ").trim();
  }
  // Khmer / English helper words that carry no topic
  var STOP = ["ខ្ញុំចង់រៀន", "ចង់រៀន", "ខ្ញុំចង់", "ខ្ញុំ", "ចង់", "រៀន", "របៀប", "ជួយ", "ស្វែងរក", "រក", "មេរៀន", "អំពី", "ពី", "ពីរបៀប", "ធ្វើម៉េច", "ធ្វើ", "ចេះ", "ពិបាក", "ងាយ", "មួយ", "ម៉េច", "យ៉ាងម៉េច", "តើ", "ប្រើ", "សូម", "បាទ", "ចាស", "ទេ", "អ្វី", "នៅណា", "ណា", "នេះ", "នោះ", "ដែល", "និង", "ឲ្យ", "ឲ", "ផង", "បន្តិច", "ជា", "ក្នុង", "the", "a", "an", "how", "to", "learn", "lesson", "lessons", "want", "i", "me", "please", "about", "what", "is", "in", "of", "for", "and", "find", "search", "help", "do", "with", "use"];
  STOP.sort(function (a, b) { return b.length - a.length; });
  var SYN = {
    "តារាង": ["table", "excel", "តារាង"], "ក្រាហ្វ": ["chart", "graph", "ក្រាហ្វ"], "គំនូសតាង": ["chart"], "កិរិយាសព្ទ": ["verb", "កិរិយាសព្ទ"],
    "អាន": ["reading", "អាន"], "ចិន": ["hsk", "chinese", "ចិន"], "អង់គ្លេស": ["english", "អង់គ្លេស"], "វីដេអូ": ["video", "premiere", "davinci", "វីដេអូ"],
    "កាត់": ["edit", "cut", "premiere", "កាត់"], "រចនា": ["design", "ux", "ui", "រចនា"], "សុវត្ថិភាព": ["security", "សុវត្ថិភាព"], "ទិន្នន័យ": ["data", "sql", "database", "ទិន្នន័យ"],
    "គេហទំព័រ": ["html", "css", "web", "website", "គេហទំព័រ"], "វេបសាយ": ["html", "web", "website"], "website": ["html", "css", "web", "website"],
    "ស្លាយ": ["slide", "powerpoint", "ស្លាយ"], "ឯកសារ": ["word", "document", "ឯកសារ"], "រូបមន្ត": ["formula", "រូបមន្ត"], "វេយ្យាករណ៍": ["grammar", "វេយ្យាករណ៍"],
    "សរសេរ": ["writing", "write", "សរសេរ"], "បញ្ចេញសំឡេង": ["pronunciation"], "សំឡេង": ["pronunciation", "audio", "សំឡេង"], "ពាក្យ": ["vocabulary", "word", "ពាក្យ"],
    "សន្ទនា": ["conversation", "speaking", "សន្ទនា"], "និយាយ": ["speaking", "និយាយ"], "ស្តាប់": ["listening", "ស្តាប់"], "ប្រឡង": ["exam", "test", "ielts", "ប្រឡង"],
    "កម្មវិធី": ["programming", "code", "app", "កម្មវិធី"], "កូដ": ["code", "programming"], "បញ្ញាសិប្បនិម្មិត": ["ai"], "ពណ៌": ["color", "ពណ៌"],
    "លំហាត់": ["exercise", "quiz", "លំហាត់"], "អក្សរ": ["alphabet", "letter", "អក្សរ"], "ផ្ទាំងគ្រប់គ្រង": ["dashboard"], "ម៉ាក្រូ": ["macro", "vba"],
    "excel": ["excel"], "word": ["word"], "ppt": ["powerpoint"], "js": ["javascript", "js"], "ts": ["typescript"], "py": ["python"], "db": ["database", "sql"],
    "chinese": ["hsk", "chinese"], "verbs": ["verb"], "irregular": ["irregular", "verb"]
  };
  function tokens(q) {
    var n = norm(q), out = [];
    // split into latin/number/CJK runs and Khmer runs
    var parts = n.match(/[ក-៿]+|[一-鿿㐀-䶿]+|[a-z0-9#+]+/g) || [];
    parts.forEach(function (p) {
      if (/[ក-៿]/.test(p)) {
        var rest = p;
        Object.keys(SYN).forEach(function (k) { if (/[ក-៿]/.test(k) && rest.indexOf(k) >= 0) { out.push(SYN[k]); rest = rest.split(k).join(" "); } });
        STOP.forEach(function (w) { if (/[ក-៿]/.test(w)) rest = rest.split(w).join(" "); });
        rest.split(" ").forEach(function (r) { if (r.length >= 2) out.push([r]); });
      } else if (STOP.indexOf(p) < 0) out.push(SYN[p] ? SYN[p].concat([p]) : [p]);
    });
    return out;
  }
  function ed1(a, b) { // edit distance ≤ 1 (or 2 for long words)
    if (a === b) return true; var la = a.length, lb = b.length, lim = Math.max(la, lb) >= 7 ? 2 : 1;
    if (Math.abs(la - lb) > lim) return false;
    var d = []; for (var i = 0; i <= la; i++) { d[i] = [i]; } for (var j = 0; j <= lb; j++) d[0][j] = j;
    for (i = 1; i <= la; i++) for (j = 1; j <= lb; j++) { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
    return d[la][lb] <= lim;
  }
  var PRE = null;
  function prep() {
    if (PRE) return PRE;
    PRE = IDX.s.map(function (e) {
      var c = BY[e[0]] || {}, t = norm(e[1].replace(/([a-z])([A-Z])/g, "$1 $2") + " " + e[1]), meta = norm([c.title, c.en, c.desc, e[0]].join(" "));
      return { e: e, t: t, meta: meta, words: (t + " " + meta).split(" ").filter(function (w) { return /^[a-z]{4,}$/.test(w); }) };
    });
    return PRE;
  }
  function search(q) {
    var tk = tokens(q); if (!tk.length) return { tk: tk, res: [], verbs: [] };
    var res = [];
    prep().forEach(function (x) {
      var sc = 0, hit = 0;
      tk.forEach(function (alts) {
        var best = 0;
        alts.forEach(function (a) {
          var short = /^[a-z0-9#+]{1,3}$/.test(a), wb = short ? new RegExp("(^| )" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)") : null;
          if (short) { if (wb.test(x.t)) best = Math.max(best, 7); else if (wb.test(x.meta)) best = Math.max(best, 3); return; }
          if (x.t.indexOf(a) >= 0) best = Math.max(best, 6 + (new RegExp("(^| )" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(x.t) ? 2 : 0));
          else if (x.meta.indexOf(a) >= 0) best = Math.max(best, 3);
          else if (/^[a-z]{4,}$/.test(a)) for (var i = 0; i < x.words.length; i++) if (ed1(a, x.words[i])) { best = Math.max(best, 2); break; }
        });
        if (best) hit++; sc += best;
      });
      if (!hit || hit < Math.ceil(tk.length / 2)) return;
      if (hit === tk.length) sc += 5;
      if (x.e[3] === "c" || x.e[3] === "l") sc += 1;
      if (/^មេរៀន/.test(x.e[1])) sc += 1;
      res.push({ e: x.e, sc: sc });
    });
    res.sort(function (a, b) { return b.sc - a.sc || a.e[1].length - b.e[1].length; });
    // keep at most 4 hits per course so one course doesn't flood the list
    var per = {}, out = [];
    var dup = {};
    res.forEach(function (r) { var k = r.e[0] + "|" + r.e[1]; if (dup[k]) return; dup[k] = 1; per[r.e[0]] = (per[r.e[0]] || 0) + 1; if (per[r.e[0]] <= 4) out.push(r); });
    // verbs
    var verbs = [], flat = [].concat.apply([], tk);
    var wantV = flat.some(function (a) { return a === "verb" || a === "verbs" || a === "កិរិយាសព្ទ"; });
    var single = tk.length === 1 && /^[a-z]+$/.test(tk[0][tk[0].length - 1]);
    if (wantV || single) IDX.v.forEach(function (v) {
      var p = v.split("|"), forms = (p[0] + " / " + p[1] + " / " + p[2]).toLowerCase().split(/\s*\/\s*/), s = 0;
      flat.forEach(function (a) {
        if (/^[a-z]+$/.test(a)) { if (forms.indexOf(a) >= 0) s = Math.max(s, 10); else if (a.length >= 3 && p[0].indexOf(a) === 0) s = Math.max(s, 3); }
        else if (wantV && /[ក-៿]/.test(a) && a.length >= 2 && p[3].indexOf(a) >= 0) s = Math.max(s, 4);
      });
      if (s && (wantV || s >= 10)) verbs.push({ p: p, s: s });
    });
    verbs.sort(function (a, b) { return b.s - a.s || a.p[0].length - b.p[0].length; });
    return { tk: tk, res: out, verbs: verbs.slice(0, 6) };
  }

  // ---------- UI
  var BOT = '<img class="xai-bot" alt="" src="data:image/webp;base64,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">';
  var LOGO = '<svg viewBox="0 0 24 24" class="xai-ico" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>';
  var SUG = ["សួស្តី 👋", "ពាក្យថ្មីថ្ងៃនេះ", "ប្រាប់រឿងកំប្លែង", "💝 ទឹកចិត្ត KHQR", "Excel PivotTable", "verb go", "HSK 3 把", "ធ្វើ website", "React Hooks", "Python loop", "SQL JOIN", "Reading A1", "Mail Merge", "កាត់វីដេអូ"];
  var root = document.createElement("div"); root.id = "xai";
  root.innerHTML =
    '<button class="xai-fab" id="xaiFab" aria-label="xCenBar Bot">' + BOT + '<span>xCenBar Bot</span></button>' +
    '<div class="xai-panel" id="xaiPanel" role="dialog" aria-label="xCenBar Bot" aria-modal="true">' +
      '<div class="xai-head"><div class="xai-av">' + BOT + '</div><div><b>xCenBar Bot</b><small>មិត្តរៀន · រកមេរៀន · និយាយលេង 😄</small></div><button class="xai-x xai-sup" id="xaiSup" type="button" title="ផ្តល់ទឹកចិត្តដល់អ្នកបង្កើត (KHQR)" aria-label="ផ្តល់ទឹកចិត្ត">💝</button><button class="xai-x" id="xaiX" aria-label="បិទ">✕</button></div>' +
      '<div class="xai-log" id="xaiLog"></div>' +
      '<form class="xai-in" id="xaiForm" autocomplete="off"><input id="xaiQ" placeholder="សួរ ឬវាយពាក្យ… ឧ. Excel PivotTable" enterkeyhint="search"><button aria-label="ផ្ញើ"><svg viewBox="0 0 24 24" class="xai-ico"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button></form>' +
    '</div>';
  document.body.appendChild(root);
  var log = root.querySelector("#xaiLog"), panel = root.querySelector("#xaiPanel"), qi = root.querySelector("#xaiQ");
  function bubble(html, who) { var d = document.createElement("div"); d.className = "xai-msg " + (who || "ai"); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips() { return '<div class="xai-chips">' + SUG.map(function (s) { return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div>"; }
  function web(q) {
    var e = encodeURIComponent(q);
    return '<div class="xai-web"><span>ស្វែងរកលើ Internet៖</span>' +
      '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + e + '"><svg viewBox="0 0 24 24" class="xai-ico"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>Google</a>' +
      '<a target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + e + '"><svg viewBox="0 0 24 24" class="xai-ico"><rect x="2" y="5" width="20" height="14" rx="4"/><path class="f" d="m10 9 5 3-5 3z"/></svg>YouTube</a>' +
      '<a target="_blank" rel="noopener" href="https://en.wikipedia.org/w/index.php?search=' + e + '"><svg viewBox="0 0 24 24" class="xai-ico"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>Wikipedia</a></div>';
  }
  var KIND = { s: "ផ្នែកមេរៀន", l: "មេរៀន", c: "វគ្គ", r: "Reading" };
  function card(r) {
    var e = r.e, c = BY[e[0]] || { title: e[0] };
    return '<button type="button" class="xai-hit" data-c="' + esc(e[0]) + '" data-a="' + esc(e[2]) + '"><img src="' + esc(icon(e[0])) + '" alt="" width="38" height="38"><span><b>' + esc(e[1]) + '</b><small>' + esc(c.title) + " · " + KIND[e[3]] + "</small></span></button>";
  }
  function vcard(v) {
    var p = v.p;
    return '<button type="button" class="xai-hit verb" data-c="english" data-a="#v/list" data-q="' + esc(p[0]) + '"><span class="vb">V</span><span><b>' + esc(p[0]) + " → " + esc(p[1]) + " → " + esc(p[2]) + "</b><small>" + esc(p[3]) + " · English Verbs</small></span></button>";
  }
  // ---------- casual chat (offline, rule-based)
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function khn(n) { return String(n).replace(/\d/g, function (d) { return KH[d]; }); }
  function qchips(list) { return '<div class="xai-chips">' + list.map(function (s) { return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div>"; }
  function who() { var n = ""; try { var u = JSON.parse(localStorage.getItem("xc_session") || "null"); n = (u && u.name) || ""; } catch (e) {} if (!n && window.XC_USER_NAME) n = window.XC_USER_NAME(); return n ? " <b>" + esc(n) + "</b>" : " អ្នក"; }
  var JOKES = [
    "ហេតុអ្វីកុំព្យូទ័រមិនដែលឃ្លាន? 🤔 — ព្រោះវាមាន <b>Bytes</b> ច្រើនពេកហើយ! 😂",
    "គ្រូ៖ «Yesterday ជា tense អ្វី?» សិស្ស៖ «Past tense!» គ្រូ៖ «ចុះ Tomorrow?» សិស្ស៖ «Pass ប្រឡង tense បាទ!» 😆",
    "Programmer ម្នាក់ចូលគេងដាក់កែវទឹកពីរ៖ មួយពេញ (ករណីស្រេកទឹក) មួយទទេ (ករណីមិនស្រេក) — <code>if/else</code> ពេញជីវិត! 🤓",
    "ហេតុអ្វី Excel ចេះរាំ? 💃 — ព្រោះវាមាន <b>Cells</b> ច្រើន… ហើយចេះ <b>SUM</b>-ba! 🎶",
    "សួរ HTML ថា៖ «សុខសប្បាយទេ?» HTML ឆ្លើយ៖ «&lt;p&gt;ល្អណាស់&lt;/p&gt;» — តែងតែបិទ tag ឲ្យត្រូវ! 😄",
    "ខ្ញុំសួរ Wi-Fi ថា «ស្រលាញ់ខ្ញុំទេ?» វាឆ្លើយ៖ «Connection lost…» 💔📶"
  ];
  var CHEER = [
    "មិនអីទេ 🤗 សម្រាកបន្តិច ផឹកទឹក ដើរ ៥ នាទី ហើយត្រឡប់មករៀនម្តង <b>១៥ នាទី</b> បានហើយ។ រៀនបន្តិចៗ ប្រសើរជាងមិនរៀនសោះ!",
    "ធម្មតាទេ — គ្រប់គ្នាធ្លាប់ធុញ ធ្លាប់ពិបាក 💪 អ្វីដែលពិបាកថ្ងៃនេះ នឹងក្លាយជាងាយនៅថ្ងៃស្អែក។ សាកជ្រើសមេរៀនខ្លីមួយ ឬលេង Quiz សិន?",
    "អ្នកពូកែជាងអ្វីដែលអ្នកគិត ✨ ចាំថា៖ <i>«ដំណើរមួយពាន់គីឡូម៉ែត្រ ចាប់ផ្តើមពីមួយជំហាន»</i>។ ថ្ងៃនេះ ១ ជំហានបានហើយ!"
  ];
  var QUOTES = [
    "«ការអប់រំ ជាអាវុធដ៏ខ្លាំងបំផុត ដែលអ្នកអាចប្រើដើម្បីផ្លាស់ប្តូរពិភពលោក។» — Nelson Mandela",
    "«កុំខ្លាចយឺត ខ្លាចតែឈប់។» 🐢➡️🏁",
    "«ចំណេះដឹង ជាទ្រព្យដែលគ្មាននរណាអាចលួចពីយើងបាន។»",
    "«ជោគជ័យ = ការខិតខំតូចៗ ដែលធ្វើម្តងហើយម្តងទៀត រាល់ថ្ងៃ។»",
    "«Practice makes progress.» — ហាត់រាល់ថ្ងៃ = ប្រសើរឡើងរាល់ថ្ងៃ 📈"
  ];
  var TOPICS = ["English A1", "HTML", "Python", "Excel", "HSK 1", "Flutter", "AI"];
  function chat(q) {
    var n = norm(q), t = " " + n + " ";
    function has(re) { return re.test(n); }
    if (has(/ចង់ស្លាប់|សម្លាប់ខ្លួន|kill myself|suicide|want to die/)) return { only: true, h: "ខ្ញុំឮអ្នកហើយ 💛 អ្វីដែលអ្នកកំពុងឆ្លងកាត់ សំខាន់ណាស់។ សូមនិយាយជាមួយ <b>ឪពុកម្តាយ គ្រូ ឬមនុស្សដែលអ្នកទុកចិត្ត</b> ឥឡូវនេះ — អ្នកមិនចាំបាច់ឆ្លងកាត់តែម្នាក់ឯងទេ។ បើមានគ្រោះថ្នាក់ភ្លាមៗ សូមទូរស័ព្ទ <b>119</b>។" };
    if (!has(/លើកទឹកចិត្ត/) && has(/ទឹកចិត្ត|ឧបត្ថម្ភ|donat|support dev|khqr dev|buy me|ជួយអ្នកបង្កើត|ផ្តល់លុយ/)) {
      var img = window.XC_KHQR_DEV ? '<img class="xai-qr" src="' + window.XC_KHQR_DEV + '" alt="KHQR">' : "";
      return { only: true, h: "អរគុណច្រើន 🙏💝 xCenBar Rean Free ឥតគិតថ្លៃជានិច្ច។ បើអ្នកចង់ផ្តល់ទឹកចិត្តដល់អ្នកបង្កើត អាចស្កេន <b>KHQR</b> នេះជាមួយកម្មវិធីធនាគារណាក៏បាន (ABA, ACLEDA, Wing, Bakong …)" + img + "ទោះតិចឬច្រើន ក៏ជួយឲ្យមានមេរៀនថ្មីៗទៀត ✨" };
    }
    if (has(/អ្នកណាបង្កើត|នរណាបង្កើត|អ្នកបង្កើត|who made|who created|creator|developer/)) return { only: true, h: "xCenBar Rean Free ត្រូវបានបង្កើតដោយ <b>xCenBar (KHQR DEV)</b> 👨‍💻 ដើម្បីឲ្យបងប្អូនខ្មែរអាចរៀនបន្ថែមក្រោយម៉ោងសាលា ដោយឥតគិតថ្លៃ។ ចង់ផ្តល់ទឹកចិត្ត? សរសេរ «ទឹកចិត្ត» 💝" };
    if (has(/(អ្នក|ឯង|បង)ជា(អ្នកណា|នរណា|អ្វី)|ឈ្មោះ(អ្វី|អី)|who are you|your name|what are you/)) return { only: true, h: "ខ្ញុំគឺ <b>xCenBar Bot</b> 🤖 — មិត្តរៀនរបស់អ្នក! ខ្ញុំជួយ <b>រកមេរៀន</b> ក្នុងវគ្គទាំង " + khn(CAT.courses.length) + " ផ្តល់ <b>ពាក្យថ្មីប្រចាំថ្ងៃ</b> លើកទឹកចិត្ត ហើយពេលខ្លះ… និយាយកំប្លែងផង 😄" + qchips(["ពាក្យថ្មីថ្ងៃនេះ", "ប្រាប់រឿងកំប្លែង", "គួររៀនអ្វី?"]) };
    if (has(/សុខសប្បាយ|សុខទេ|how are you|how r u|how is it going|ម៉េចហើយ|សុខស្រួល/)) return { only: true, h: pick(["ខ្ញុំសុខសប្បាយ អរគុណ 😊 ចុះ" + who() + " វិញ? ថ្ងៃនេះចង់រៀនអ្វីដែរ?", "ល្អណាស់ 🤖⚡ Battery 100%! ថ្ងៃនេះ" + who() + " ចង់រៀនអ្វី?", "សប្បាយណាស់ ដែលបានជួប" + who() + "! តោះរៀនអ្វីថ្មីមួយ 🚀"]) + qchips(TOPICS.slice(0, 4)) };
    if (has(/^(សួស្តី|ជំរាបសួរ|ជម្រាបសួរ|សួរស្តី|hello|hi|hey|yo|hii+|ហាយ|ហេឡូ|អរុណសួស្តី|good morning|good afternoon|good evening)( |$)/)) {
      var hr = new Date().getHours(), tod = hr < 11 ? "អរុណសួស្តី ☀️" : hr < 17 ? "ទិវាសួស្តី 🌤️" : "សាយណ្ហសួស្តី 🌙";
      var rest = n.replace(/^(សួស្តី|ជំរាបសួរ|ជម្រាបសួរ|សួរស្តី|hello|hi|hey|yo|hii+|ហាយ|ហេឡូ|អរុណសួស្តី|good morning|good afternoon|good evening)/, "").replace(/bot|xcenbar|បង|អូន|ប្អូន|ណា|ទេ|អើយ/g, "").trim();
      return { only: rest.length < 3, h: tod + who() + "! ខ្ញុំជា <b>xCenBar Bot</b> 🤖 ចង់រៀនអ្វីថ្ងៃនេះ? ឬចង់និយាយលេងសិនក៏បាន 😄" + qchips(["ពាក្យថ្មីថ្ងៃនេះ", "ប្រាប់រឿងកំប្លែង", "គួររៀនអ្វី?", "លើកទឹកចិត្តខ្ញុំផង"]) };
    }
    if (has(/អរគុណ|thank|thx|tks|ty( |$)|អគុណ/)) return { only: true, h: pick(["មិនអីទេ 😊 រៀនបានល្អណាស់!", "ជានិច្ច! 🤖💙 មានអ្វីសួរខ្ញុំទៀតបាន។", "Welcome! 🙌 រៀនឲ្យសប្បាយ!"]) };
    if (has(/លាហើយ|bye|goodbye|see you|ជួបគ្នាពេលក្រោយ|ទៅគេង|good night|រាត្រីសួស្តី|គេងហើយ/)) return { only: true, h: pick(["រាត្រីសួស្តី 🌙 គេងឲ្យបានគ្រប់ម៉ោង — ខួរក្បាលចងចាំមេរៀនពេលគេង! 😴", "Bye bye! 👋 ស្អែកមករៀនបន្តទៀតណា!", "ជួបគ្នាពេលក្រោយ 🤖 កុំភ្លេចរំលឹកពាក្យថ្មីណា!"]) };
    if (has(/ធុញ|ហត់|នឿយ|អស់កម្លាំង|bored|tired|សោកសៅ|sad|ខ្ជិល|lazy|មិនចង់រៀន|ពិបាកណាស់|ធ្វើមិនកើត|អស់សង្ឃឹម|stress|តានតឹង|ភ័យ/)) return { only: true, h: pick(CHEER) + qchips(["ប្រាប់រឿងកំប្លែង", "ពាក្យថ្មីថ្ងៃនេះ", "លើកទឹកចិត្តខ្ញុំផង"]) };
    if (has(/កំប្លែង|joke|funny|សើច|លេងសើច/)) return { only: true, h: pick(JOKES) + qchips(["មួយទៀត 😂", "ពាក្យថ្មីថ្ងៃនេះ"]) };
    if (has(/មួយទៀត/)) return { only: true, h: pick(JOKES) + qchips(["មួយទៀត 😂"]) };
    if (has(/លើកទឹកចិត្ត|motivat|inspire|quote|សម្រង់/)) return { only: true, h: "💡 " + pick(QUOTES) + qchips(["លើកទឹកចិត្តខ្ញុំផង", "គួររៀនអ្វី?"]) };
    if (has(/ពាក្យថ្មី|ពាក្យថ្ងៃនេះ|word of the day|new word|random word/) && IDX.v.length) {
      var v = pick(IDX.v).split("|");
      return { only: true, h: "📖 <b>ពាក្យថ្មីថ្ងៃនេះ</b>៖ <b style=\"font-size:1.25em\">" + esc(v[0]) + "</b> → " + esc(v[1]) + " → " + esc(v[2]) + "<br>ន័យ៖ " + esc(v[3]) + "<br>✍️ សាកសរសេរប្រយោគ ១ ដោយប្រើពាក្យនេះ!" + qchips(["ពាក្យថ្មីថ្ងៃនេះ", "verb " + v[0]]) };
    }
    if (has(/គួររៀនអ្វី|រៀនអ្វីល្អ|ចាប់ផ្តើមពីណា|ណែនាំ|recommend|what should i learn|where to start/)) return { only: true, h: "🧭 ណែនាំតាមគោលដៅ៖<br>• 🗣️ <b>ភាសា</b> → English A1 ឬ HSK 1<br>• 💻 <b>ចង់ធ្វើ Website</b> → HTML → CSS → JavaScript<br>• 🐍 <b>ចង់សរសេរកូដដំបូង</b> → Python<br>• 📱 <b>ចង់ធ្វើ App</b> → Flutter<br>• 📊 <b>ការងារការិយាល័យ</b> → Excel · Word<br>ចុចប្រធានបទខាងក្រោម៖" + qchips(TOPICS) };
    if (has(/ម៉ោងប៉ុន្មាន|what time|ថ្ងៃនេះថ្ងៃអ្វី|ថ្ងៃនេះថ្ងៃអី|what day/)) {
      var d = new Date(), DAYS = ["អាទិត្យ", "ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
      return { only: true, h: "🕒 ឥឡូវម៉ោង <b>" + khn(("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)) + "</b> ថ្ងៃ" + DAYS[d.getDay()] + " — ពេលល្អសម្រាប់រៀន ២០ នាទី! ⏱️" };
    }
    if (has(/ល្អណាស់|អស្ចារ្យ|ពូកែ|cool|awesome|nice|great|ស្រលាញ់|love you|ចូលចិត្ត bot|amazing/)) return { only: n.length < 22, h: pick(["អរគុណ 🥰 អ្នកក៏ពូកែដែរ!", "Yay! 🎉 តោះរៀនបន្តទៀត!", "ខ្ញុំក៏ចូលចិត្តជួយ" + who() + " ដែរ 🤖💙"]) };
    if (has(/^(haha+|ហាហា+|555+|lol|😂+|🤣+)/)) return { only: true, h: pick(["😆😆", "ហាហា 🤭 សើចបានធ្វើឲ្យខួរក្បាលស្រស់!", "😂 តោះ! រៀនទាំងសើច!"]) };
    if (has(/^(ok|okay|យល់ហើយ|បាទ|ចាស|ចា|អូខេ|អូ៎)$/)) return { only: true, h: pick(["👍 ល្អ!", "OK 👌 ចង់រកមេរៀនអ្វី វាយមកបាន។"]) };
    return null;
  }
  function ask(q) {
    q = q.trim(); if (!q) return;
    bubble(esc(q), "me");
    var cc = chat(q);
    if (cc && cc.only) { var tb = bubble('<span class="xai-dots"><i></i><i></i><i></i></span>'); setTimeout(function () { tb.innerHTML = cc.h; log.scrollTop = log.scrollHeight; }, 450); return; }
    var r = search(q), n = r.res.length + r.verbs.length;
    if (cc && !n) { var tb2 = bubble('<span class="xai-dots"><i></i><i></i><i></i></span>'); setTimeout(function () { tb2.innerHTML = cc.h; log.scrollTop = log.scrollHeight; }, 450); return; }
    var think = bubble('<span class="xai-dots"><i></i><i></i><i></i></span>');
    setTimeout(function () {
      var h = "";
      if (!n) {
        h = "សុំទោស ខ្ញុំរកមិនឃើញមេរៀនអំពី «<b>" + esc(q) + "</b>» ក្នុង xCenBar ទេ។ សាកប្រើពាក្យផ្សេង ឬស្វែងរកលើ Internet៖" + web(q) + chips();
      } else {
        var courses = {}; r.res.forEach(function (x) { courses[x.e[0]] = 1; });
        h = (cc ? cc.h.replace(/<div class="xai-chips">[\s\S]*$/, "") + "<br><br>" : "") + "ខ្ញុំរកឃើញ <b>" + n + "</b> លទ្ធផល" + (Object.keys(courses).length ? " ក្នុង <b>" + Object.keys(courses).length + "</b> វគ្គ" : "") + " សម្រាប់ «" + esc(q) + "»៖";
        h += '<div class="xai-list">' + r.verbs.map(vcard).join("") + r.res.slice(0, 6).map(card).join("") + "</div>";
        if (r.res.length > 6) h += '<details class="xai-more"><summary>បង្ហាញបន្ថែម (' + (r.res.length - 6) + ")</summary><div class=\"xai-list\">" + r.res.slice(6, 30).map(card).join("") + "</div></details>";
        h += web(q);
      }
      think.innerHTML = h; log.scrollTop = log.scrollHeight;
      think.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 350);
  }
  function open() {
    panel.classList.add("on"); document.body.classList.add("xai-open");
    if (!log.children.length) bubble("សួស្តី! ខ្ញុំជា <b>xCenBar Bot</b> 🤖 — មិត្តរៀនរបស់អ្នក។ សរសេរប្រធានបទដែលចង់រៀន (ខ្មែរ · English · 中文) ខ្ញុំរកមេរៀនក្នុងវគ្គទាំង " + CAT.courses.length + " ឲ្យ ព្រមទាំង link Google · YouTube · Wikipedia។ ឬ <b>និយាយលេង</b> ជាមួយខ្ញុំក៏បាន — សួរពាក្យថ្មី រឿងកំប្លែង ឬសុំការលើកទឹកចិត្ត 😄 សាកមើល៖" + chips());
    setTimeout(function () { qi.focus(); }, 150);
  }
  function close() { panel.classList.remove("on"); document.body.classList.remove("xai-open"); }
  root.querySelector("#xaiSup").onclick = function () { ask("💝 ទឹកចិត្ត KHQR"); };
  root.querySelector("#xaiFab").onclick = open; root.querySelector("#xaiX").onclick = close;
  root.querySelector("#xaiForm").onsubmit = function (e) { e.preventDefault(); var q = qi.value; qi.value = ""; ask(q); };
  addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("on")) close(); });
  log.addEventListener("click", function (e) {
    var c = e.target.closest("[data-q]"); if (c && !c.classList.contains("xai-hit")) { ask(c.dataset.q); return; }
    var h = e.target.closest(".xai-hit"); if (!h) return;
    var cid = h.dataset.c, a = h.dataset.a, vq = h.dataset.q || "";
    close();
    if (window.XC_OPEN_LESSON) window.XC_OPEN_LESSON(cid, { a: a, q: vq });
    else { var c2 = BY[cid]; if (c2) { try { sessionStorage.setItem("xc_ai_q", vq); } catch (er) {} location.href = "lessons/" + c2.file + (a || ""); } }
  });
  window.XC_AI = { search: search, open: open, ask: ask };
})();
