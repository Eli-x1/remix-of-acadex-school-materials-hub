import { useEffect, useState } from "react";

export type Lang = "en" | "fr" | "rw";
const KEY = "acadex_lang_v1";

const dict = {
  en: {
    dashboard: "Dashboard", schools: "Schools", students: "Students", classes: "Classes",
    staff: "Staff", staff_roles: "Staff Roles", materials: "Materials", tracking: "Tracking",
    reports: "Reports", settings: "Settings", signout: "Sign out",
    add: "Add", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", view: "View",
    name: "Name", email: "Email", username: "Username", role: "Role", password: "Password",
    bulk_import: "Bulk import", download_template: "Download template", import_csv: "Import CSV",
    paste_csv: "Paste CSV here",
    archive_term: "Archive & rollover", archives: "Archives", current_term: "Current term",
    promote_students: "Promote students to next class",
    audit_log: "Audit log", actor: "Actor", action: "Action", target: "Target", time: "Time",
    export_pdf: "Export PDF", print: "Print",
    language: "Language", appearance: "Appearance", theme: "Theme", light: "Light", dark: "Dark",
    profile: "Profile", change_password: "Change password",
    completed: "Completed", pending: "Pending", overdue: "Overdue",
    student_profile: "Student profile", history: "History", parent_phone: "Parent phone",
    materials_summary: "Materials summary", no_records: "No records.",
    confirm_archive: "Archive current term and start a new one?",
    archived_at: "Archived at", year: "Year", term: "Term",
  },
  fr: {
    dashboard: "Tableau de bord", schools: "Écoles", students: "Élèves", classes: "Classes",
    staff: "Personnel", staff_roles: "Rôles du personnel", materials: "Matériels", tracking: "Suivi",
    reports: "Rapports", settings: "Paramètres", signout: "Déconnexion",
    add: "Ajouter", save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", edit: "Modifier", view: "Voir",
    name: "Nom", email: "Email", username: "Nom d'utilisateur", role: "Rôle", password: "Mot de passe",
    bulk_import: "Importation en masse", download_template: "Télécharger modèle", import_csv: "Importer CSV",
    paste_csv: "Coller le CSV ici",
    archive_term: "Archiver & passage", archives: "Archives", current_term: "Trimestre actuel",
    promote_students: "Promouvoir les élèves",
    audit_log: "Journal d'audit", actor: "Acteur", action: "Action", target: "Cible", time: "Heure",
    export_pdf: "Exporter PDF", print: "Imprimer",
    language: "Langue", appearance: "Apparence", theme: "Thème", light: "Clair", dark: "Sombre",
    profile: "Profil", change_password: "Changer mot de passe",
    completed: "Terminé", pending: "En attente", overdue: "En retard",
    student_profile: "Profil de l'élève", history: "Historique", parent_phone: "Tél. parent",
    materials_summary: "Résumé des matériels", no_records: "Aucun enregistrement.",
    confirm_archive: "Archiver le trimestre actuel et en commencer un nouveau ?",
    archived_at: "Archivé le", year: "Année", term: "Trimestre",
  },
  rw: {
    dashboard: "Imbonerahamwe", schools: "Amashuri", students: "Abanyeshuri", classes: "Amashuri (classes)",
    staff: "Abakozi", staff_roles: "Imirimo y'abakozi", materials: "Ibikoresho", tracking: "Gukurikirana",
    reports: "Raporo", settings: "Igenamiterere", signout: "Sohoka",
    add: "Ongeraho", save: "Bika", cancel: "Hagarika", delete: "Siba", edit: "Hindura", view: "Reba",
    name: "Izina", email: "Imeyili", username: "Izina ry'umukoresha", role: "Inshingano", password: "Ijambo ry'ibanga",
    bulk_import: "Kwinjiza byinshi", download_template: "Manura urugero", import_csv: "Kwinjiza CSV",
    paste_csv: "Manika CSV hano",
    archive_term: "Bika & uhindure", archives: "Ububiko", current_term: "Igihembwe gikora",
    promote_students: "Zamura abanyeshuri",
    audit_log: "Igitabo cy'ibikorwa", actor: "Uwakoze", action: "Igikorwa", target: "Igikorewe", time: "Igihe",
    export_pdf: "Ohereza PDF", print: "Sohora",
    language: "Ururimi", appearance: "Imboniro", theme: "Insanganyamatsiko", light: "Urumuri", dark: "Umwijima",
    profile: "Umwirondoro", change_password: "Hindura ijambo ry'ibanga",
    completed: "Byarangiye", pending: "Bitegerejwe", overdue: "Byarengeje",
    student_profile: "Umwirondoro w'umunyeshuri", history: "Amateka", parent_phone: "Telefone y'umubyeyi",
    materials_summary: "Incamake y'ibikoresho", no_records: "Nta nyandiko.",
    confirm_archive: "Bika igihembwe ugitangira ikindi?",
    archived_at: "Byabitswe", year: "Umwaka", term: "Igihembwe",
  },
} as const;

export type TKey = keyof typeof dict["en"];

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem(KEY) as Lang | null) ?? "en";
}
export function setLang(l: Lang) {
  localStorage.setItem(KEY, l);
  window.dispatchEvent(new Event("acadex:lang"));
}
export function t(key: TKey, lang: Lang = getLang()): string {
  return (dict[lang] as Record<string, string>)[key] ?? (dict.en as Record<string, string>)[key] ?? key;
}

export function useLang() {
  const [lang, setL] = useState<Lang>(() => getLang());
  useEffect(() => {
    const h = () => setL(getLang());
    window.addEventListener("acadex:lang", h);
    return () => window.removeEventListener("acadex:lang", h);
  }, []);
  return {
    lang,
    setLang: (l: Lang) => { setLang(l); setL(l); },
    t: (key: TKey) => t(key, lang),
  };
}
