"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  RotateCcw,
  Award,
  Users,
  CheckCircle2,
  Flame,
  Share2,
  Check,
  Sparkles,
  Handshake,
  ShieldCheck,
  GraduationCap,
  MapPin,
  Clock,
  Mic,
  FileBadge,
  CalendarClock,
  RefreshCw,
  UserPlus,
  Plus,
  X,
  QrCode,
  LogIn,
  UserCheck,
} from "lucide-react";

type TabKey =
  | "ziyadah"
  | "murajaah"
  | "tasmi"
  | "halaqah"
  | "partner_alumni"
  | "admin_bph";
type HalaqahFilter = "thalibat" | "thullab" | "alumni";
type PartnerGenderFilter = "thalibat" | "thullab" | "alumni";

export default function JhtFullAppPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ziyadah");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdminOrMusyrif, setIsAdminOrMusyrif] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile & Core State
  const [profile, setProfile] = useState<any>({
    full_name: "Aisyah Humaira",
    gender: "thalibah",
    prodi: "Akuntansi Syariah",
    angkatan: 2024,
    status_keanggotaan: "aktif",
    halaqah_name: "Halaqah Thalibat Al-Fath",
    musyrif_name: "Ustadzah Nabila, Lc.",
    total_juz_hafal: 13,
    current_ziyadah_juz: 8,
    current_ziyadah_page: 142,
    current_ziyadah_surah: "QS. Al-An'am (6) : Ayat 111 – 118",
    current_tikrar_count: 14,
    peer_simak_partner: "Fatimah Az-Zahra",
    exam_mode_active: false,
    streak_days: 19,
    tasmi_target_category: "5 Juz",
    tasmi_target_range: "Juz 1 – 5",
    tasmi_readiness_pct: 85,
    tasmi_registered: false,
  });

  // Collections from DB
  const [ziyadahLogs, setZiyadahLogs] = useState<any[]>([]);
  const [juzHealth, setJuzHealth] = useState<any[]>([]);
  const [murajaahLogs, setMurajaahLogs] = useState<any[]>([]);
  const [halaqahMembers, setHalaqahMembers] = useState<any[]>([]);
  const [partnerPosts, setPartnerPosts] = useState<any[]>([]);

  // UI Interactive States
  const [halaqahFilter, setHalaqahFilter] = useState<HalaqahFilter>("thalibat");
  const [partnerFilter, setPartnerFilter] =
    useState<PartnerGenderFilter>("thalibat");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [invitedPartners, setInvitedPartners] = useState<Record<string, boolean>>(
    {}
  );
  const [rolledSemester, setRolledSemester] = useState<boolean>(false);
  const [baidCompletedToday, setBaidCompletedToday] = useState<boolean>(false);

  // Forms & Modals
  const [showZiyadahForm, setShowZiyadahForm] = useState<boolean>(false);
  const [ziyadahPageInput, setZiyadahPageInput] = useState<number>(142);
  const [ziyadahSurahInput, setZiyadahSurahInput] = useState<string>(
    "QS. Al-An'am (6) : Ayat 111 – 118"
  );
  const [ziyadahPeerInput, setZiyadahPeerInput] = useState<string>(
    "Fatimah Az-Zahra"
  );
  const [ziyadahNotesInput, setZiyadahNotesInput] = useState<string>("");

  const [showPartnerForm, setShowPartnerForm] = useState<boolean>(false);
  const [newPartnerLoc, setNewPartnerLoc] = useState<string>(
    "Musholla Akhwat Kampus Utama"
  );
  const [newPartnerSlot, setNewPartnerSlot] = useState<string>(
    "Hari ini, 12.30 – 13.30 WIB (Jeda Kuliah)"
  );
  const [newPartnerTarget, setNewPartnerTarget] = useState<string>(
    "Simak Muraja'ah Juz 5 (1/2 Juz)"
  );

  const [showOprecForm, setShowOprecForm] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberGender, setNewMemberGender] = useState<"thalibah" | "thalib">(
    "thalibah"
  );
  const [newMemberProdi, setNewMemberProdi] = useState<string>(
    "Ekonomi Syariah"
  );
  const [newMemberAngkatan, setNewMemberAngkatan] = useState<number>(2026);
  const [newMemberJuz, setNewMemberJuz] = useState<number>(5);

  const [showSkpiModal, setShowSkpiModal] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const fetchJhtData = useCallback(async () => {
    try {
      const res = await fetch("/api/jht", { cache: "no-store" });
      const json = await res.json();
      if (json?.data) {
        setIsLoggedIn(Boolean(json.data.isLoggedIn));
        setIsAdminOrMusyrif(Boolean(json.data.isAdminOrMusyrif));
        if (json.data.profile) {
          setProfile(json.data.profile);
          setZiyadahPageInput(json.data.profile.current_ziyadah_page || 142);
          setZiyadahSurahInput(
            json.data.profile.current_ziyadah_surah ||
              "QS. Al-An'am (6) : Ayat 111 – 118"
          );
        }
        if (Array.isArray(json.data.ziyadahLogs))
          setZiyadahLogs(json.data.ziyadahLogs);
        if (Array.isArray(json.data.juzHealth))
          setJuzHealth(json.data.juzHealth);
        if (Array.isArray(json.data.murajaahLogs))
          setMurajaahLogs(json.data.murajaahLogs);
        if (Array.isArray(json.data.halaqahMembers))
          setHalaqahMembers(json.data.halaqahMembers);
        if (Array.isArray(json.data.partnerPosts))
          setPartnerPosts(json.data.partnerPosts);
      }
    } catch (err) {
      console.error("Failed to load JHT data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJhtData();
  }, [fetchJhtData]);

  const tikrarCount = Number(profile.current_tikrar_count) || 0;
  const tikrarTarget = 20;
  const tikrarPct = Math.min(100, Math.round((tikrarCount / tikrarTarget) * 100));

  const handleUpdateTikrar = async (nextCount: number) => {
    setProfile((prev: any) => ({ ...prev, current_tikrar_count: nextCount }));
    try {
      await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_tikrar",
          tikrar_count: nextCount,
        }),
      });
    } catch {}
  };

  const handleToggleExamMode = async () => {
    const nextVal = !profile.exam_mode_active;
    setProfile((prev: any) => ({ ...prev, exam_mode_active: nextVal }));
    showToast(
      nextVal
        ? "🎓 Mode UTS/UAS Diaktifkan: Streak dijaga & target dialihkan ke Muraja'ah ringan."
        : "✅ Mode Normal Aktif Kembali: Target Ziyadah harian dilanjutkan."
    );
    try {
      await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_exam_mode",
          exam_mode_active: nextVal,
        }),
      });
    } catch {}
  };

  const handleSubmitZiyadah = async (
    method: "mandiri" | "voice_note" | "tatap_muka"
  ) => {
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_ziyadah",
          page_number: ziyadahPageInput,
          juz: profile.current_ziyadah_juz,
          surah_ayah: ziyadahSurahInput,
          tikrar_count: tikrarCount,
          submission_method: method,
          peer_simak_by: ziyadahPeerInput,
          notes: ziyadahNotesInput,
        }),
      });
      const json = await res.json();
      if (json?.data?.log) {
        setZiyadahLogs((prev) => [json.data.log, ...prev]);
      }
      if (json?.data?.profile) {
        setProfile(json.data.profile);
        setZiyadahPageInput(json.data.profile.current_ziyadah_page);
      }
      setShowZiyadahForm(false);
      setZiyadahNotesInput("");
      showToast(
        method === "voice_note"
          ? "🎙️ Setoran Voice Note berhasil dikirim ke Musyrif/Musyrifah!"
          : "✅ Pengajuan Setoran Ziyadah berhasil tercatat di database!"
      );
    } catch {
      showToast("Gagal menyimpan setoran ziyadah.");
    }
  };

  const handleCompleteMurajaah = async (
    juzNum: number,
    tipe: "qarib" | "baid",
    targetRange: string
  ) => {
    if (tipe === "baid" && juzNum === 5) {
      setBaidCompletedToday(true);
    }
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_murajaah",
          juz: juzNum,
          tipe,
          target_range: targetRange,
        }),
      });
      const json = await res.json();
      if (json?.data?.juzHealth) {
        setJuzHealth(json.data.juzHealth);
      }
      if (json?.data?.murajaahLog) {
        setMurajaahLogs((prev) => [json.data.murajaahLog, ...prev]);
      }
      showToast(
        `✅ Muraja'ah Juz ${juzNum} tercatat selesai! Status Peta Kesehatan diperbarui ke Mutqin.`
      );
    } catch {
      showToast("Gagal memperbarui muraja'ah.");
    }
  };

  const handleSelectTasmiCategory = async (category: string) => {
    const rangeMap: Record<string, string> = {
      "1 Juz": "Juz 30",
      "3 Juz": "Juz 1 – 3",
      "5 Juz": "Juz 1 – 5",
      "10 Juz": "Juz 1 – 10",
      "15 Juz": "Juz 1 – 15",
      "20 Juz": "Juz 1 – 20",
      "30 Juz": "Juz 1 – 30 (Khatam)",
    };
    const nextRange = rangeMap[category] || "Juz 1 – 5";
    setProfile((prev: any) => ({
      ...prev,
      tasmi_target_category: category,
      tasmi_target_range: nextRange,
    }));
    try {
      await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_tasmi_target",
          tasmi_target_category: category,
          tasmi_target_range: nextRange,
        }),
      });
      showToast(`🎯 Target Tasmi' diubah ke ${category} (${nextRange}).`);
    } catch {}
  };

  const handleRegisterTasmiExam = async () => {
    setProfile((prev: any) => ({
      ...prev,
      tasmi_registered: true,
      tasmi_readiness_pct: Math.max(prev.tasmi_readiness_pct || 85, 92),
    }));
    try {
      await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_tasmi_target",
          tasmi_target_category: profile.tasmi_target_category,
          tasmi_target_range: profile.tasmi_target_range,
          tasmi_registered: true,
        }),
      });
      showToast(
        "🎉 Pendaftaran Sidang Tasmi' berhasil diajukan ke Koordinator Penguji JHT!"
      );
    } catch {}
  };

  const handleCreatePartnerPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_partner_post",
          gender_category: partnerFilter,
          campus_location: newPartnerLoc,
          free_time_slot: newPartnerSlot,
          target_simak: newPartnerTarget,
        }),
      });
      const json = await res.json();
      if (json?.data?.post) {
        setPartnerPosts((prev) => [json.data.post, ...prev]);
      }
      setShowPartnerForm(false);
      showToast("🤝 Jadwal Cari Partner Simak berhasil dipublikasikan!");
    } catch {
      showToast("Gagal membuat pengumuman partner simak.");
    }
  };

  const handleAddOprecMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_member",
          full_name: newMemberName.trim(),
          gender: newMemberGender,
          prodi: newMemberProdi,
          angkatan: newMemberAngkatan,
          total_juz_hafal: newMemberJuz,
        }),
      });
      const json = await res.json();
      if (Array.isArray(json?.data?.halaqahMembers)) {
        setHalaqahMembers(json.data.halaqahMembers);
      }
      setNewMemberName("");
      setShowOprecForm(false);
      showToast(
        `✅ ${
          newMemberGender === "thalib" ? "Thalib" : "Thalibah"
        } baru berhasil ditambahkan & di-assign ke Halaqah!`
      );
    } catch {
      showToast("Gagal menambahkan anggota baru.");
    }
  };

  const handleGraduateBatch = async () => {
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_graduate_batch",
          angkatan: 2022,
        }),
      });
      const json = await res.json();
      if (Array.isArray(json?.data?.halaqahMembers)) {
        setHalaqahMembers(json.data.halaqahMembers);
      }
      showToast(
        "🎓 Angkatan <= 2022 resmi dipindahkan ke Komunitas Huffazh Alumni Tazkia!"
      );
    } catch {
      showToast("Gagal memproses graduasi alumni.");
    }
  };

  const handleVerifyZiyadah = async (logId: number) => {
    try {
      const res = await fetch("/api/jht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_verify_ziyadah",
          log_id: logId,
          predikat: "Mumtaz (Lulus)",
        }),
      });
      const json = await res.json();
      if (Array.isArray(json?.data?.ziyadahLogs)) {
        setZiyadahLogs(json.data.ziyadahLogs);
      }
      showToast("✅ Setoran Ziyadah disahkan dengan predikat Mumtaz (Lulus)!");
    } catch {}
  };

  const handleCopyShareLink = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : "https://hiaqli.pro/jht";
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const toggleInvitePartner = (id: string) => {
    setInvitedPartners((prev) => ({ ...prev, [id]: !prev[id] }));
    showToast("📨 Ajakan simak bareng telah dikirim ke rekan!");
  };

  const getJuzInfo = (juzNum: number) => {
    const found = juzHealth.find((j) => Number(j.juz) === juzNum);
    if (!found || found.status === "empty") {
      return { juz: juzNum, status: "empty", label: "-", putaran: 0 };
    }
    if (found.status === "progress") {
      return {
        juz: juzNum,
        status: "progress",
        label: "Ziyadah",
        putaran: found.putaran_count || 1,
      };
    }
    let daysAgo = 1;
    if (found.last_murajaah_at) {
      const diffMs = Date.now() - new Date(found.last_murajaah_at).getTime();
      daysAgo = Math.max(0, Math.floor(diffMs / 86400000));
    }
    return {
      juz: juzNum,
      status: found.status,
      label: daysAgo === 0 ? "Hari ini" : `${daysAgo}h lalu`,
      putaran: found.putaran_count || 1,
    };
  };

  const filteredHalaqahMembers = halaqahMembers.filter((m) => {
    if (halaqahFilter === "alumni") return m.status_keanggotaan === "alumni";
    if (halaqahFilter === "thullab")
      return m.gender === "thalib" && m.status_keanggotaan !== "alumni";
    return m.gender === "thalibah" && m.status_keanggotaan !== "alumni";
  });

  const filteredPartnerPosts = partnerPosts.filter(
    (p) => p.gender_category === partnerFilter
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0F1E3C] pb-16 font-sans">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#0F1E3C] text-white border border-[#8CC63F] px-4 py-3 rounded-2xl shadow-2xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-[#8CC63F] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="bg-[#0F1E3C] text-white border-b border-white/10 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#8CC63F] text-[#0F1E3C] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Aplikasi Aktif
            </span>
            <span className="text-xs text-slate-200 font-medium">
              Jami&apos;atul Huffazh Tazkia • Sistem Mutaba&apos;ah Digital
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8CC63F]/20 border border-[#8CC63F]/40 text-[#B8F06D] text-xs font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{profile.full_name}</span>
              </span>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15"
              >
                <LogIn className="w-3.5 h-3.5 text-[#8CC63F]" />
                <span>Login Akun</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer border border-white/15"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#8CC63F]" />
                  <span>Link Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#8CC63F]" />
                  <span>Bagikan Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-4">
        {/* Hero Brand Card: Jami'atul Huffazh Tazkia */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B367C] via-[#13285E] to-[#0E1E47] text-white p-5 sm:p-6 shadow-xl border border-white/10">
          <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#8CC63F]/20 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {/* Custom SVG Logo matching Jami'atul Huffazh Tazkia Dome + Mushaf */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 100 100"
                  className="w-10 h-10 sm:w-11 sm:h-11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M50 12V20"
                    stroke="#1B367C"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M32 54C32 35 42 22 50 20C44 25 39 37 39 54H32Z"
                    fill="#1B367C"
                  />
                  <path
                    d="M68 54C68 35 58 22 50 20C56 25 61 37 61 54H68Z"
                    fill="#8CC63F"
                  />
                  <path
                    d="M20 62C30 58 42 60 50 67C58 60 70 58 80 62L77 56C67 53 57 55 50 62C43 55 33 53 23 56L20 62Z"
                    fill="#8CC63F"
                  />
                  <path
                    d="M15 72C28 66 41 68 47 74C48.5 76 51.5 76 53 74C59 68 72 66 85 72L82 66C70 61 58 63 50 70C42 63 30 61 18 66L15 72Z"
                    fill="#1B367C"
                  />
                </svg>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8CC63F]/20 border border-[#8CC63F]/45 text-[#B8F06D] text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  Jami&apos;atul Huffazh Tazkia
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-snug">
                  Mutaba&apos;ah Tahfizh Al-Qur&apos;an
                </h1>
                <p className="text-xs text-slate-200/90 mt-0.5">
                  {profile.gender === "thalib" ? "Thalib" : "Thalibah"}:{" "}
                  <strong className="text-white">{profile.full_name}</strong> (
                  {profile.prodi} &apos;{String(profile.angkatan).slice(-2)}) •{" "}
                  {profile.halaqah_name} •{" "}
                  <strong className="text-[#B8F06D]">
                    {profile.total_juz_hafal} Juz Hafal
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleExamMode}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                  profile.exam_mode_active
                    ? "bg-amber-400 text-[#0F1E3C] border-amber-300 shadow-sm"
                    : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>
                  {profile.exam_mode_active
                    ? "Mode UTS/UAS Aktif (Streak Freeze)"
                    : "Aktifkan Mode UTS/UAS"}
                </span>
              </button>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{" "}
                {profile.streak_days} Hari Istiqamah
              </span>
            </div>
          </div>

          {profile.exam_mode_active && (
            <div className="relative z-10 mt-3 rounded-2xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-2">
              <span>
                🎓 <strong>Mode Ujian Kampus (UTS/UAS/KKN) Aktif:</strong> Target Ziyadah harian di-pause sementara dan dialihkan ke Muraja&apos;ah ringan agar nilai akademik &amp; hafalan sama-sama terjaga tanpa memutus streak.
              </span>
            </div>
          )}

          {/* 3 Core Feature Quick Summary */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("ziyadah")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "ziyadah"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                1. Sesi Ziyadah
              </div>
              <div className="text-sm sm:text-base font-extrabold text-[#B8F06D] mt-0.5">
                Hal. {profile.current_ziyadah_page}
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                {profile.current_ziyadah_surah}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("murajaah")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "murajaah"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                2. Sesi Muraja&apos;ah
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                {baidCompletedToday ? "2 / 2 Sesi" : "1 / 2 Sesi"}
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                Qarib Juz 7 • Ba&apos;id Juz 5
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tasmi")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "tasmi"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                3. Target Tasmi&apos;
              </div>
              <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
                {profile.tasmi_target_category} ({profile.tasmi_readiness_pct}%)
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                {profile.tasmi_target_range} •{" "}
                {profile.tasmi_registered ? "Terdaftar Ujian" : "H-9 Ujian"}
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Segmented Tabs (6 Tabs) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-[#DCE5F2] shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ziyadah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "ziyadah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>1. Sesi Ziyadah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("murajaah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "murajaah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>2. Sesi Muraja&apos;ah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tasmi")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "tasmi"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>3. Target Tasmi&apos;</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("halaqah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "halaqah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>4. Halaqah Thullab/Thalibat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("partner_alumni")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "partner_alumni"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Handshake className="w-3.5 h-3.5 shrink-0" />
            <span>5. Partner Simak &amp; Alumni</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin_bph")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "admin_bph"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>6. Panel Admin BPH</span>
          </button>
        </div>

        {/* TAB 1: SESI ZIYADAH */}
        {activeTab === "ziyadah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    SETORAN ZIYADAH HARI INI • JUZ {profile.current_ziyadah_juz}
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    {profile.current_ziyadah_surah}
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Mushaf Madinah Halaman {profile.current_ziyadah_page} •
                    Musyrif/Musyrifah: {profile.musyrif_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowZiyadahForm((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF3FF] hover:bg-[#dbeafe] text-[#1B367C] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ubah Halaman / Catatan Setoran</span>
                </button>
              </div>

              {showZiyadahForm && (
                <div className="mb-4 p-3.5 rounded-2xl bg-[#F4F7FB] border border-[#DCE5F2] space-y-2.5 text-xs">
                  <div className="font-extrabold text-[#1B367C]">
                    Form Input Target &amp; Catatan Setoran Ziyadah
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Halaman Mushaf (1-604)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={604}
                        value={ziyadahPageInput}
                        onChange={(e) =>
                          setZiyadahPageInput(Number(e.target.value) || 1)
                        }
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Surah &amp; Rentang Ayat
                      </label>
                      <input
                        type="text"
                        value={ziyadahSurahInput}
                        onChange={(e) => setZiyadahSurahInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Partner Simak Sebaya
                      </label>
                      <input
                        type="text"
                        value={ziyadahPeerInput}
                        onChange={(e) => setZiyadahPeerInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                      Catatan Setoran / Kendala Ayat (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sudah lancar 15 baris, mohon koreksi tajwid ayat 114..."
                      value={ziyadahNotesInput}
                      onChange={(e) => setZiyadahNotesInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Mushaf Preview Box */}
              <div className="rounded-2xl bg-[#FAFDF6] border border-[#D9EBB8] p-4 mb-4 text-right">
                <p
                  dir="rtl"
                  className="font-serif text-xl sm:text-2xl leading-loose text-[#12264B]"
                >
                  ۞ وَلَوْ أَنَّنَا نَزَّلْنَآ إِلَيْهِمُ ٱلْمَلَـٰٓئِكَةَ وَكَلَّمَهُمُ ٱلْمَوْتَىٰ وَحَشَرْنَا عَلَيْهِمْ كُلَّ شَىْءٍ قَبُلًا مَّا كَانُوا۟ لِيُؤْمِنُوٓا۟ إِلَّآ أَن يَشَآءَ ٱللَّهُ...
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5A6B8C] font-semibold mt-2 pt-2 border-t border-[#E4F0CE]">
                  <span>
                    ✓ Validasi Peer-Simak: Sudah disimak oleh{" "}
                    <strong>{ziyadahPeerInput}</strong>
                  </span>
                  <span>Hal. {profile.current_ziyadah_page} • Blok Penuh</span>
                </div>
              </div>

              {/* Interactive Tikrar Counter (Persisted to DB) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F7FB] rounded-2xl p-3.5 border border-[#DCE5F2]">
                <div>
                  <div className="text-[11px] font-extrabold text-[#5A6B8C] uppercase">
                    COUNTER TIKRAR ZIYADAH (WAJIB MIN. 20x • TERSIMPAN OTOMATIS)
                  </div>
                  <div className="text-2xl font-black text-[#1B367C] mt-0.5">
                    {tikrarCount} / {tikrarTarget}{" "}
                    <span className="text-xs font-bold text-[#4E7A14]">
                      ({tikrarPct}%)
                    </span>
                  </div>
                  <div className="w-44 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-[#1B367C] to-[#8CC63F] transition-all"
                      style={{ width: `${tikrarPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateTikrar(0)}
                    className="px-3 py-2.5 rounded-xl border border-[#DCE5F2] bg-white text-xs font-extrabold text-[#5A6B8C] hover:bg-slate-50 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTikrar(tikrarCount + 1)}
                    className="px-5 py-2.5 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-sm font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    +1 Tikrar
                  </button>
                </div>
              </div>

              {/* Action Buttons (Connected to /api/jht) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => handleSubmitZiyadah("voice_note")}
                  className="py-3 px-4 rounded-xl border border-[#DCE5F2] bg-white hover:bg-slate-50 text-[#1B367C] text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-4 h-4" />
                  <span>Kirim Voice Note Setoran (Jika Kuliah Bentrok)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitZiyadah("tatap_muka")}
                  className="py-3 px-4 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] text-xs font-extrabold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajukan Setoran Tatap Muka ke Musyrif/Musyrifah</span>
                </button>
              </div>
            </div>

            {/* Riwayat Setoran Ziyadah (Live Database Rows) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F1E3C]">
                    Riwayat Setoran Ziyadah ({ziyadahLogs.length} Catatan)
                  </h3>
                  <p className="text-xs text-[#5A6B8C]">
                    Data tersimpan di database JHT • Musyrif dapat langsung mengesahkan predikat
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                  Live Database
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {ziyadahLogs.map((log) => {
                  const isPending =
                    log.predikat === "Menunggu Simak Musyrif" ||
                    log.predikat === "Voice Note Terkirim";
                  return (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                    >
                      <div>
                        <div className="font-extrabold text-[#0F1E3C]">
                          Hal. {log.page_number} • {log.surah_ayah}{" "}
                          <span className="text-[#5A6B8C] font-semibold">
                            ({log.tikrar_count}x Tikrar)
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                          Peer-Simak: {log.peer_simak_by || "-"} •{" "}
                          {log.notes || "Setoran tercatat"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleVerifyZiyadah(log.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#1B367C] text-white text-[10px] font-extrabold hover:bg-[#13285E] cursor-pointer"
                          >
                            Sahkan Mumtaz
                          </button>
                        )}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            log.predikat?.includes("Mumtaz")
                              ? "bg-[#EAF7D8] text-[#3B630A]"
                              : isPending
                              ? "bg-[#FEF3C7] text-[#92400E]"
                              : "bg-[#EAF3FF] text-[#1B367C]"
                          }`}
                        >
                          {log.predikat}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SESI MURAJA'AH */}
        {activeTab === "murajaah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#4E7A14] uppercase tracking-wider">
                    SISTEM DUA LAPIS MURAJA&apos;AH JHT
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C]">
                    Jadwal Muraja&apos;ah Hari Ini
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                  {baidCompletedToday ? "2 / 2 Selesai" : "1 / 2 Selesai"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Murajaah Qarib */}
                <div className="p-3.5 rounded-2xl bg-[#F7FBF1] border border-[#CBE6A3]">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                      MURAJA&apos;AH QARIB (DEKAT)
                    </span>
                    <span className="text-[11px] font-extrabold text-[#3B630A]">
                      ✓ Selesai
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[#0F1E3C] mt-2">
                    Juz 7 • Hal. 135 – 141
                  </div>
                  <p className="text-xs text-[#5A6B8C] mt-0.5">
                    Pengikat hafalan baru 5–7 halaman terakhir sebelum tambah ziyadah.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCompleteMurajaah(
                        7,
                        "qarib",
                        "Juz 7 • Hal. 135 – 141 (Muraja'ah Qarib)"
                      )
                    }
                    className="mt-2.5 w-full py-2 rounded-xl bg-[#EAF7D8] hover:bg-[#d8f0b8] text-[#2F5206] text-xs font-extrabold cursor-pointer"
                  >
                    + Catat Ulang Putaran Qarib Juz 7
                  </button>
                </div>

                {/* Murajaah Ba'id */}
                <div className="p-3.5 rounded-2xl bg-[#FFFDF5] border border-[#F5DFA3]">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#92400E]">
                      MURAJA&apos;AH BA&apos;ID (LAMA)
                    </span>
                    <span className="text-[11px] font-extrabold text-[#B45309]">
                      {baidCompletedToday ? "✓ Selesai" : "Menunggu Setor"}
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[#0F1E3C] mt-2">
                    Juz 5 (An-Nisa&apos;) • 1/2 Juz Kedua
                  </div>
                  <p className="text-xs text-[#5A6B8C] mt-0.5">
                    Rotasi berkala juz yang sudah lulus agar siap diujikan saat Tasmi&apos;.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCompleteMurajaah(
                        5,
                        "baid",
                        "Juz 5 (An-Nisa') • 1/2 Juz Kedua"
                      )
                    }
                    className={`mt-2.5 w-full py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                      baidCompletedToday
                        ? "bg-[#EAF7D8] text-[#3B630A]"
                        : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                    }`}
                  >
                    {baidCompletedToday
                      ? "✓ Tercatat Mutqin Hari Ini"
                      : "Tandai Selesai Muraja'ah Ba'id"}
                  </button>
                </div>
              </div>
            </div>

            {/* Peta Kesehatan Hafalan 30 Juz (Clickable to log murajaah!) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F1E3C]">
                    Peta Kesehatan Hafalan 30 Juz (Klik Kotak Juz untuk Catat Muraja&apos;ah)
                  </h3>
                  <p className="text-xs text-[#5A6B8C]">
                    Klik salah satu Juz di bawah untuk langsung memperbarui statusnya menjadi Mutqin (Hijau)
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                  Interaktif • 30 Juz
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-[#5A6B8C] mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#8CC63F]" /> Mutqin (&lt;7 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" /> Perlu Muraja&apos;ah (7–14 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#EF4444]" /> Rawan Lupa (&gt;14 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#1B367C]" /> Sedang Ziyadah
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                  const info = getJuzInfo(juzNum);
                  let boxClass =
                    "bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8] hover:border-[#1B367C]";
                  if (info.status === "mutqin") {
                    boxClass =
                      "bg-[#EAF7D8] border-[#B6E080] text-[#2F5206] hover:bg-[#dff2c4]";
                  } else if (info.status === "warning") {
                    boxClass =
                      "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E] hover:bg-[#fde68a]";
                  } else if (info.status === "urgent") {
                    boxClass =
                      "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B] hover:bg-[#fecaca]";
                  } else if (info.status === "progress") {
                    boxClass = "bg-[#1B367C] border-[#1B367C] text-white";
                  }

                  return (
                    <button
                      key={juzNum}
                      type="button"
                      onClick={() =>
                        handleCompleteMurajaah(
                          juzNum,
                          "baid",
                          `Juz ${juzNum} • Muraja'ah Mandiri`
                        )
                      }
                      className={`rounded-xl p-2 text-center border transition-all cursor-pointer active:scale-95 ${boxClass}`}
                      title={`Klik untuk catat selesai muraja'ah Juz ${juzNum}`}
                    >
                      <div className="text-xs font-extrabold">Juz {juzNum}</div>
                      <div className="text-[9px] font-semibold opacity-85 mt-0.5">
                        {info.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TARGET TASMI' */}
        {activeTab === "tasmi" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    TARGET &amp; KESIAPAN UJIAN TASMI&apos; SEKALI DUDUK
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    Target Aktif: Tasmi&apos; {profile.tasmi_target_category} (
                    {profile.tasmi_target_range})
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Jadwal Tasmi&apos;: Sabtu, 4 Desember 2026 • Penguji:{" "}
                    {profile.tasmi_examiner || "Ustadzah Hafizhah, Lc."}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                    profile.tasmi_registered
                      ? "bg-[#EAF7D8] text-[#3B630A]"
                      : "bg-[#FEF3C7] text-[#92400E]"
                  }`}
                >
                  {profile.tasmi_registered
                    ? "✓ Terdaftar Sidang Tasmi'"
                    : "H-9 Menuju Tasmi'"}
                </span>
              </div>

              {/* Pilihan Kategori Tasmi */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  "1 Juz",
                  "3 Juz",
                  "5 Juz",
                  "10 Juz",
                  "15 Juz",
                  "20 Juz",
                  "30 Juz",
                ].map((kat) => (
                  <button
                    key={kat}
                    type="button"
                    onClick={() => handleSelectTasmiCategory(kat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                      profile.tasmi_target_category === kat
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-[#F1F5F9] text-[#475569] border-[#DCE5F2] hover:bg-slate-200/70"
                    }`}
                  >
                    Tasmi&apos; {kat}
                  </button>
                ))}
              </div>

              {/* Indikator Kesiapan Tasmi */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F0F7E6] to-[#EAF3FF] border border-[#C5E0A5] mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1B367C]">
                    Indikator Kesiapan Tasmi&apos; (Syarat Minimal 3x Putaran Muraja&apos;ah)
                  </span>
                  <span className="text-base font-black text-[#3B630A]">
                    {profile.tasmi_readiness_pct}% Siap
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden my-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#1B367C] to-[#8CC63F] transition-all"
                    style={{ width: `${profile.tasmi_readiness_pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#334155] font-medium gap-1">
                  <span>✓ Juz 1–4 sudah 3x putaran muraja&apos;ah lancar</span>
                  <span className="font-bold text-[#92400E]">
                    • Klik Juz 5 di tab Muraja&apos;ah untuk menggenapkan putaran
                  </span>
                </div>
              </div>

              {/* Checklist Syarat Tasmi */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      1. Lulus Setoran Ziyadah Seluruh Halaman (
                      {profile.tasmi_target_range})
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Telah disahkan oleh {profile.musyrif_name}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                    ✓ Terpenuhi
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      2. Putaran Simak Mandiri &amp; Partner (Min. 3x Putaran)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Juz 1 (3/3) • Juz 2 (3/3) • Juz 3 (3/3) • Juz 4 (3/3) • Juz 5 (2/3)
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#92400E]">
                    14 / 15 Putaran
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      3. E-Transkrip &amp; Sertifikat Tasmi&apos; QR-Verified (SKPI Kampus)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Terbit otomatis untuk lampiran SKPI Wisuda &amp; Beasiswa Tahfizh Tazkia
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                    Siap Cetak
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSkpiModal(true)}
                  className="py-3 px-4 rounded-xl border border-[#DCE5F2] bg-white hover:bg-slate-50 text-[#1B367C] text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileBadge className="w-4 h-4" />
                  <span>Buka E-Transkrip Tahfizh (SKPI)</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegisterTasmiExam}
                  className={`py-3 px-4 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer ${
                    profile.tasmi_registered
                      ? "bg-[#EAF7D8] text-[#3B630A]"
                      : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                  }`}
                >
                  {profile.tasmi_registered
                    ? "✓ Terdaftar di Jadwal Sidang Tasmi'"
                    : "Ajukan Pendaftaran Jadwal Sidang Tasmi'"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HALAQAH THULLAB & THALIBAT */}
        {activeTab === "halaqah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    MONITORING MUSYRIF &amp; MUSYRIFAH JHT
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C]">
                    Rekap Halaqah Thullab &amp; Thalibat ({filteredHalaqahMembers.length} Anggota)
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Istilah <strong>Thalib / Thalibah</strong> untuk perorangan &amp;{" "}
                    <strong>Thullab / Thalibat</strong> untuk kelompok halaqah.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHalaqahFilter("thalibat")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      halaqahFilter === "thalibat"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Halaqah Thalibat (Akhwat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalaqahFilter("thullab")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      halaqahFilter === "thullab"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Halaqah Thullab (Ikhwan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalaqahFilter("alumni")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      halaqahFilter === "alumni"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Komunitas Alumni
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {filteredHalaqahMembers.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-[#F8FAFD] border border-[#E5ECF6] text-[#5A6B8C]">
                    Belum ada anggota pada kategori ini. Admin BPH dapat meluluskan angkatan senior ke Alumni atau menambah anggota Oprec baru di Tab 6.
                  </div>
                ) : (
                  filteredHalaqahMembers.map((m, idx) => (
                    <div
                      key={m.user_id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                    >
                      <div>
                        <div className="font-extrabold text-[#0F1E3C]">
                          {idx + 1}. {m.full_name}{" "}
                          <span className="text-[#1B367C]">
                            (
                            {m.status_keanggotaan === "alumni"
                              ? "Alumni JHT"
                              : m.gender === "thalib"
                              ? "Thalib"
                              : "Thalibah"}{" "}
                            • {m.prodi} &apos;{String(m.angkatan).slice(-2)} •{" "}
                            {m.total_juz_hafal} Juz)
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                          {m.halaqah_name} • Ziyadah: Hal.{" "}
                          {m.current_ziyadah_page} • Target Tasmi&apos;{" "}
                          {m.tasmi_target_category}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          m.status_keanggotaan === "alumni"
                            ? "bg-[#EAF3FF] text-[#1B367C]"
                            : m.streak_days >= 10
                            ? "bg-[#EAF7D8] text-[#3B630A]"
                            : "bg-[#FEF3C7] text-[#92400E]"
                        }`}
                      >
                        {m.status_keanggotaan === "alumni"
                          ? "Alumni Lifetime"
                          : `Aktif • ${m.streak_days}h`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PARTNER SIMAK & ALUMNI */}
        {activeTab === "partner_alumni" && (
          <div className="space-y-3.5">
            {/* Bursa Partner Simak */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    INTERAKSI ANTAR ANGGOTA • FILTER GENDER OTOMATIS
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    Bursa Partner Simak (&ldquo;Cari Pasangan Setoran&rdquo;)
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Temukan rekan Thalib/Thalibah yang sedang jam kosong kuliah untuk saling menyimak.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPartnerForm((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] text-xs font-extrabold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Posting Jadwal Kosong Saya</span>
                </button>
              </div>

              {showPartnerForm && (
                <form
                  onSubmit={handleCreatePartnerPost}
                  className="mb-4 p-3.5 rounded-2xl bg-[#F4F7FB] border border-[#DCE5F2] space-y-2.5 text-xs"
                >
                  <div className="font-extrabold text-[#1B367C]">
                    Posting Ajakan Simak Bareng di Kampus / Online
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Lokasi Kampus / Online
                      </label>
                      <input
                        type="text"
                        value={newPartnerLoc}
                        onChange={(e) => setNewPartnerLoc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Jam Kosong Kuliah
                      </label>
                      <input
                        type="text"
                        value={newPartnerSlot}
                        onChange={(e) => setNewPartnerSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#5A6B8C] mb-1">
                        Target Juz / Halaman Simak
                      </label>
                      <input
                        type="text"
                        value={newPartnerTarget}
                        onChange={(e) => setNewPartnerTarget(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPartnerForm(false)}
                      className="px-3 py-1.5 rounded-xl border border-[#DCE5F2] bg-white text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#1B367C] text-white text-xs font-extrabold cursor-pointer"
                    >
                      Publikasikan
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3.5">
                <button
                  type="button"
                  onClick={() => setPartnerFilter("thalibat")}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                    partnerFilter === "thalibat"
                      ? "bg-[#1B367C] text-white border-[#1B367C]"
                      : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                  }`}
                >
                  Thalibat (Akhwat)
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerFilter("thullab")}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                    partnerFilter === "thullab"
                      ? "bg-[#1B367C] text-white border-[#1B367C]"
                      : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                  }`}
                >
                  Thullab (Ikhwan)
                </button>
                <button
                  type="button"
                  onClick={() => setPartnerFilter("alumni")}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                    partnerFilter === "alumni"
                      ? "bg-[#1B367C] text-white border-[#1B367C]"
                      : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                  }`}
                >
                  Jaringan Alumni
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {filteredPartnerPosts.map((item) => {
                  const key = String(item.id);
                  const isInvited = !!invitedPartners[key];
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                    >
                      <div className="space-y-1">
                        <div className="font-extrabold text-[#0F1E3C]">
                          {item.user_name}{" "}
                          <span className="text-[#1B367C]">
                            ({item.meta_info})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A6B8C]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0F1E3C]">
                            <MapPin className="w-3.5 h-3.5 text-[#1B367C]" />
                            {item.campus_location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#4E7A14]" />
                            {item.free_time_slot}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-[#3B630A]">
                          {item.target_simak}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleInvitePartner(key)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isInvited
                            ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                            : "bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200]"
                        }`}
                      >
                        {isInvited ? "✓ Ajakan Terkirim" : "Ajak Simak Bareng"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mode Alumni Seumur Hidup */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-[#1B367C]" />
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F1E3C]">
                  Mode Alumni Seumur Hidup (Lifetime Huffazh Tazkia)
                </h3>
              </div>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Saat mahasiswa lulus wisuda, akun tidak dihapus melainkan otomatis berpindah ke{" "}
                <strong>Komunitas Alumni JHT</strong> agar hafalan tetap terjaga di dunia kerja.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    1. Peta Kesehatan 30 Juz Abadi
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Seluruh riwayat Ziyadah, Muraja&apos;ah, dan Sertifikat Tasmi&apos; selama kuliah tersimpan permanen.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    2. Keluar dari Kuota Halaqah Kampus
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Tidak membebani kuota Musyrif mahasiswa aktif, namun punya ruang halaqah daring khusus alumni.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    3. Badge &ldquo;Musyrif / Penguji Tamu&rdquo;
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Alumni yang mutqin 15–30 Juz dapat ikut menyimak adik-adik tingkat secara online saat pekan Tasmi&apos;.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    4. Portofolio Syahadah QR-Verified
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Link verifikasi resmi JHT Tazkia untuk dilampirkan di CV, studi lanjut, atau beasiswa pascasarjana.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PANEL ADMIN BPH & KADERISASI */}
        {activeTab === "admin_bph" && (
          <div className="space-y-3.5">
            {/* Alur Siklus 4 Tahap */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                MANAJEMEN SIKLUS ORGANISASI MAHASISWA
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                Panel Admin BPH &amp; Kadiv Kaderisasi JHT
              </h2>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Kelola Open Recruitment Maba, Rolling Halaqah tiap semester, hingga Graduasi Massal ke Mode Alumni.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    1. OPREC MABA
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Import &amp; Placement
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Tambah anggota baru hasil Oprec &amp; otomatis masuk ke Halaqah Thullab/Thalibat.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    2. TIAP SEMESTER
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Rolling Halaqah
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Pindah kelompok halaqah mengikuti jadwal KRS baru tanpa mereset riwayat juz sebelumnya.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    3. KADERISASI
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Promosi Musyrif/BPH
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Angkat Thalib/Thalibah senior menjadi Musyrif atau serah-terima jabatan BPH baru 1 klik.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A] mb-1.5">
                    4. WISUDA
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Graduasi ke Alumni
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Luluskan angkatan akhir secara massal ke Mode Alumni tanpa menghapus akun mereka.
                  </p>
                </div>
              </div>
            </div>

            {/* Aksi Nyata Admin BPH (Connected to Database) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <h3 className="text-sm font-extrabold text-[#0F1E3C] mb-1">
                Aksi Cepat Admin BPH (Terhubung ke Database JHT)
              </h3>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Perubahan di bawah langsung memperbarui daftar anggota di Tab 4 (Halaqah Thullab/Thalibat &amp; Komunitas Alumni).
              </p>

              <div className="space-y-2.5 text-xs">
                {/* Action 1: Tambah Anggota Oprec */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-[#1B367C]" />
                        <span>
                          1. Tambah &amp; Auto-Assign Anggota Baru (Oprec Mahasiswa Baru)
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Input hasil Placement Test Thalib/Thalibah baru dan langsung masukkan ke Halaqah
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOprecForm((v) => !v)}
                      className="px-3.5 py-2 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-xs font-extrabold cursor-pointer"
                    >
                      {showOprecForm ? "Tutup Form" : "+ Tambah Anggota Oprec"}
                    </button>
                  </div>

                  {showOprecForm && (
                    <form
                      onSubmit={handleAddOprecMember}
                      className="mt-3 pt-3 border-t border-[#DCE5F2] grid grid-cols-1 sm:grid-cols-5 gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Nama Lengkap..."
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold sm:col-span-2"
                        required
                      />
                      <select
                        value={newMemberGender}
                        onChange={(e) =>
                          setNewMemberGender(
                            e.target.value as "thalibah" | "thalib"
                          )
                        }
                        className="px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold"
                      >
                        <option value="thalibah">Thalibah (Akhwat)</option>
                        <option value="thalib">Thalib (Ikhwan)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Prodi..."
                        value={newMemberProdi}
                        onChange={(e) => setNewMemberProdi(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-[#DCE5F2] bg-white font-semibold"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] font-extrabold cursor-pointer"
                      >
                        Simpan ke DB
                      </button>
                    </form>
                  )}
                </div>

                {/* Action 2: Rolling Semester */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-[#1B367C]" />
                      <span>
                        2. Rolling Semester Baru (Ganjil → Genap 2026/2027)
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Sesuaikan ulang jadwal halaqah dengan KRS terbaru tanpa kehilangan progres 30 Juz mahasiswa
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRolledSemester(true);
                      showToast(
                        "✅ Rolling Semester Baru berhasil! Seluruh progres 30 Juz mahasiswa tetap terjaga."
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      rolledSemester
                        ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                        : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                    }`}
                  >
                    {rolledSemester
                      ? "✓ Semester Baru Aktif"
                      : "Rolling Semester Baru"}
                  </button>
                </div>

                {/* Action 3: Graduasi Alumni (Updates DB!) */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#4E7A14]" />
                      <span>
                        3. Wisuda Angkatan Senior (&le; 2022) ke Mode Alumni Seumur Hidup
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Memindahkan anggota angkatan &le; 2022 dari Halaqah Aktif ke tab Komunitas Alumni di database
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGraduateBatch}
                    className="px-3.5 py-2 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] text-xs font-extrabold transition-all cursor-pointer"
                  >
                    Luluskan Massal ke Alumni
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal E-Transkrip Tahfizh & SKPI Kampus */}
      {showSkpiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 border border-[#DCE5F2] shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#E5ECF6] pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EAF7D8] text-[#3B630A]">
                  Dokumen Resmi QR-Verified • SKPI Kampus
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-[#1B367C] mt-1">
                  E-Transkrip Mutaba&apos;ah &amp; Syahadah Tasmi&apos; JHT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSkpiModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#F8FAFD] border border-[#DCE5F2] p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5A6B8C]">Nama Lengkap:</span>
                <strong className="text-[#0F1E3C]">{profile.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B8C]">Program Studi / Angkatan:</span>
                <strong className="text-[#0F1E3C]">
                  {profile.prodi} ({profile.angkatan})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B8C]">Halaqah &amp; Pembimbing:</span>
                <strong className="text-[#0F1E3C]">
                  {profile.halaqah_name} ({profile.musyrif_name})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B8C]">Total Capaian Hafalan:</span>
                <strong className="text-[#3B630A]">
                  {profile.total_juz_hafal} Juz (Mutqin)
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A6B8C]">Capaian Tasmi&apos; Sekali Duduk:</span>
                <strong className="text-[#1B367C]">
                  Tasmi&apos; {profile.tasmi_target_category} ({profile.tasmi_target_range})
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAFDF6] border border-[#D9EBB8]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#1B367C] text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-[11px]">
                  <div className="font-extrabold text-[#0F1E3C]">
                    Terverifikasi Digital oleh Jami&apos;atul Huffazh Tazkia
                  </div>
                  <div className="text-[#5A6B8C]">
                    Berlaku untuk lampiran SKPI Wisuda &amp; Beasiswa Tahfizh
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1B367C] text-white text-xs font-extrabold hover:bg-[#13285E] cursor-pointer shrink-0"
              >
                Cetak / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
