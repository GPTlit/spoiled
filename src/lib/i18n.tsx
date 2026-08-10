import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar" | "fr";

export const LANGS: { code: Lang; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
  { code: "fr", label: "French", native: "Français", dir: "ltr" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.watch": "Watch",
  "nav.feed": "Feed",
  "nav.theories": "Theories",
  "nav.community": "Community",
  "nav.library": "Library",
  "nav.studio": "Studio",
  "nav.chats": "Chats",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.admin": "Admin",
  "common.back": "Back",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.new": "New",
  "common.search": "Search",
  "common.loading": "Loading...",
  "common.send": "Send",
  "common.language": "Language",
  "common.download": "Download PDF",
  "common.public": "Public",
  "common.private": "Private",
  "common.generate": "Generate",
  "common.upload": "Upload",
  "common.close": "Close",
  "watch.title": "Streaming services",
  "watch.subtitle": "Pick a platform, pick a show, pick an episode — get the breakdown.",
  "watch.popular": "Popular on",
  "watch.seasons": "Seasons",
  "watch.episode": "Episode",
  "salem.name": "SALEM",
  "salem.tagline": "The AI who watched everything",
  "salem.placeholder": "Talk to SALEM...",
  "salem.history": "Last 48 hours",
  "salem.newChat": "New chat",
  "salem.spoilersOn": "Spoilers on",
  "salem.spoilersOff": "Spoilers off",
  "salem.thinking": "SALEM is thinking...",
  "sw.name": "SCREEN WRITER",
  "sw.tagline": "Write your movie with an AI co-writer",
  "sw.projects": "Projects",
  "sw.newProject": "New project",
  "sw.manuscript": "Manuscript",
  "sw.page": "Page",
  "sw.addToManuscript": "Add to manuscript",
  "sw.cover": "Cover",
  "book.title": "Show to book",
  "book.subtitle": "Turn a whole show into a book you can read and download.",
  "book.style": "Style",
  "book.generate": "Write the book",
  "chats.title": "Chats",
  "chats.groups": "Groups",
  "chats.direct": "Direct",
  "chats.pin": "Pin",
  "chats.unpin": "Unpin",
  "chats.message": "Message",
  "chats.empty": "No conversations yet.",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.watch": "المشاهدة",
  "nav.feed": "المنشورات",
  "nav.theories": "النظريات",
  "nav.community": "المجتمع",
  "nav.library": "مكتبتي",
  "nav.studio": "الاستوديو",
  "nav.chats": "المحادثات",
  "nav.signIn": "تسجيل الدخول",
  "nav.signOut": "تسجيل الخروج",
  "nav.admin": "الإدارة",
  "common.back": "رجوع",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.delete": "حذف",
  "common.new": "جديد",
  "common.search": "بحث",
  "common.loading": "جارٍ التحميل...",
  "common.send": "إرسال",
  "common.language": "اللغة",
  "common.download": "تحميل PDF",
  "common.public": "عام",
  "common.private": "خاص",
  "common.generate": "توليد",
  "common.upload": "رفع",
  "common.close": "إغلاق",
  "watch.title": "منصات البث",
  "watch.subtitle": "اختر منصة، ثم مسلسلاً، ثم حلقة — واحصل على التحليل.",
  "watch.popular": "الأكثر مشاهدة على",
  "watch.seasons": "المواسم",
  "watch.episode": "الحلقة",
  "salem.name": "سالم",
  "salem.tagline": "الذكاء الذي شاهد كل شيء",
  "salem.placeholder": "تحدث مع سالم...",
  "salem.history": "آخر 48 ساعة",
  "salem.newChat": "محادثة جديدة",
  "salem.spoilersOn": "الحرق مفعّل",
  "salem.spoilersOff": "الحرق متوقف",
  "salem.thinking": "سالم يفكر...",
  "sw.name": "كاتب السيناريو",
  "sw.tagline": "اكتب فيلمك مع مساعد ذكي",
  "sw.projects": "المشاريع",
  "sw.newProject": "مشروع جديد",
  "sw.manuscript": "المخطوطة",
  "sw.page": "صفحة",
  "sw.addToManuscript": "أضف إلى المخطوطة",
  "sw.cover": "الغلاف",
  "book.title": "من مسلسل إلى كتاب",
  "book.subtitle": "حوّل مسلسلاً كاملاً إلى كتاب تقرأه وتحمّله.",
  "book.style": "الأسلوب",
  "book.generate": "اكتب الكتاب",
  "chats.title": "المحادثات",
  "chats.groups": "المجموعات",
  "chats.direct": "الخاص",
  "chats.pin": "تثبيت",
  "chats.unpin": "إلغاء التثبيت",
  "chats.message": "رسالة",
  "chats.empty": "لا توجد محادثات بعد.",
};

const fr: Dict = {
  "nav.home": "Accueil",
  "nav.watch": "Regarder",
  "nav.feed": "Fil",
  "nav.theories": "Théories",
  "nav.community": "Communauté",
  "nav.library": "Bibliothèque",
  "nav.studio": "Studio",
  "nav.chats": "Discussions",
  "nav.signIn": "Se connecter",
  "nav.signOut": "Se déconnecter",
  "nav.admin": "Admin",
  "common.back": "Retour",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.new": "Nouveau",
  "common.search": "Rechercher",
  "common.loading": "Chargement...",
  "common.send": "Envoyer",
  "common.language": "Langue",
  "common.download": "Télécharger le PDF",
  "common.public": "Public",
  "common.private": "Privé",
  "common.generate": "Générer",
  "common.upload": "Téléverser",
  "common.close": "Fermer",
  "watch.title": "Plateformes de streaming",
  "watch.subtitle": "Choisissez une plateforme, une série, un épisode — obtenez l'analyse.",
  "watch.popular": "Populaire sur",
  "watch.seasons": "Saisons",
  "watch.episode": "Épisode",
  "salem.name": "SALEM",
  "salem.tagline": "L'IA qui a tout regardé",
  "salem.placeholder": "Parlez à SALEM...",
  "salem.history": "Dernières 48 heures",
  "salem.newChat": "Nouvelle discussion",
  "salem.spoilersOn": "Spoilers activés",
  "salem.spoilersOff": "Spoilers désactivés",
  "salem.thinking": "SALEM réfléchit...",
  "sw.name": "SCREEN WRITER",
  "sw.tagline": "Écrivez votre film avec une IA",
  "sw.projects": "Projets",
  "sw.newProject": "Nouveau projet",
  "sw.manuscript": "Manuscrit",
  "sw.page": "Page",
  "sw.addToManuscript": "Ajouter au manuscrit",
  "sw.cover": "Couverture",
  "book.title": "Série en livre",
  "book.subtitle": "Transformez une série entière en livre à lire et télécharger.",
  "book.style": "Style",
  "book.generate": "Écrire le livre",
  "chats.title": "Discussions",
  "chats.groups": "Groupes",
  "chats.direct": "Privé",
  "chats.pin": "Épingler",
  "chats.unpin": "Détacher",
  "chats.message": "Message",
  "chats.empty": "Aucune conversation pour l'instant.",
};

const DICTS: Record<Lang, Dict> = { en, ar, fr };

type Ctx = { lang: Lang; dir: "ltr" | "rtl"; setLang: (l: Lang) => void; t: (key: string) => string };

const I18nContext = createContext<Ctx>({ lang: "en", dir: "ltr", setLang: () => {}, t: (k) => en[k] ?? k });

const STORAGE_KEY = "spoiled-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && DICTS[saved]) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string) => DICTS[lang][key] ?? en[key] ?? key, [lang]);

  const value = useMemo(
    () => ({ lang, dir: (lang === "ar" ? "rtl" : "ltr") as "ltr" | "rtl", setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function languageName(code: Lang) {
  return LANGS.find((l) => l.code === code)?.label ?? "English";
}
