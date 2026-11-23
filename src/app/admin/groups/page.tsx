'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, authFetch } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  Phone, 
  Clock, 
  ShieldAlert, 
  Radio, 
  Copy, 
  Check, 
  Edit3, 
  Filter,
  Layers,
  Video,
  Sparkles,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GroupItem {
  id: string;
  name: string;
  program_type: string;
  program_category: 'tikrar' | 'mufradat' | 'ngaji' | 'other';
  whatsapp_group_link: string | null;
  whatsapp_group_id: string | null;
  musyrifah: string | null;
  schedule: string | null;
  zoom_link: string | null;
  member_count: number;
  source_table: 'halaqahs' | 'mufradat_groups';
}

interface MemberItem {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string;
  tikrar_current_page?: number | null;
  is_tikrar_paid?: boolean;
}

interface LogItem {
  id: string;
  user_id: string | null;
  recipient: string;
  message: string;
  status: string;
  type: string;
  metadata: any;
  created_at: string;
}

const TEMPLATE_PANDUAN_TIKRAR = `*BISMILLAHIRRAHMANIRRAHIM* 📖✨
*PANDUAN RESMI ALUR LATIHAN PROGRAM HI TIKRAR*
_Sahabat AQLI Digital - Menghafal Al-Qur'an Lebih Kuat & Berkah_

Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti Fillah 🌸

Selamat datang di program *Hi Tikrar*! Agar latihan mandiri dan setoran berjalan lancar serta hafalan menancap kuat (mutqin), berikut panduan langkah demi langkah yang *wajib* disimak dan dipraktikkan:

━━━━━━━━━━━━━━━━━━━
📌 *LANGKAH 1: ISI JADWAL & KOMITMEN (WAJIB PERTAMA KALI)*
━━━━━━━━━━━━━━━━━━━
Sebelum membuka mushaf, buka website di https://hiaqli.pro/tikrar dan masuk ke tab *Target & Jadwal*:
1. Tentukan *Target Juz* (misal Juz 30).
2. Tentukan *Durasi Target Selesai* (misal 1 bulan / 2 bulan).
3. Pilih *Jumlah Hari Aktif per Pekan* (misal 5 atau 6 hari).
4. Klik tombol *Simpan Jadwal*.
*(Catatan: Tab Mushaf baru akan terbuka setelah jadwal tersimpan agar hafalan terarah).*

━━━━━━━━━━━━━━━━━━━
📖 *LANGKAH 2: LATIHAN DI TAB MUSHAF TIKRAR*
━━━━━━━━━━━━━━━━━━━
Setelah jadwal tersimpan, masuk ke tab *Mushaf*:
1. *Pilih Halaman Target*: Klik tombol "Mulai dari Hal. {halaman}" atau pilih nomor halaman yang ingin dihafal melalui menu dropdown halaman.
2. *Langkah 1: Simak Audio (5x)*
   - Putar audio murottal per ayat.
   - Simak pelafalan makhraj dan tajwidnya dengan teliti sebanyak minimal 5 kali repetisi.
3. *Langkah 2: Repetisi Blok (A, B, C, D)*
   - Tiap halaman dibagi menjadi 4 blok warna (A, B, C, D).
   - Fokus hafal blok A dengan repetisi (20x/40x) sampai lancar, lalu lanjutkan ke blok berikutnya.
   - Sambungkan antaran blok (A+B, lalu A+B+C, dst) hingga 1 halaman utuh.
4. *Fitur Terjemah Per Kata*:
   - Klik kata Arab pada mushaf untuk melihat terjemahan kata per kata agar tadabbur hafalan semakin kuat.

━━━━━━━━━━━━━━━━━━━
🎯 *LANGKAH 3: UJIAN & SETORAN MUTQIN*
━━━━━━━━━━━━━━━━━━━
1. Setelah 1 halaman mutqin, klik tombol *Ujian Halaman Ini*.
2. Kerjakan tes sambung ayat / tebak kata untuk menguji daya ingat.
3. Catat setoran harian dan periksa checklist ketercapaian di halaman profil Anda.

Semoga Allah Subhanahu wa Ta'ala memudahkan setiap lisan dan hati kita dalam menjaga ayat-ayat suci Al-Qur'an. Aamiin 🤲✨

_Wassalamu'alaikum Warahmatullahi Wabarakatuh_
— *Tim Musyrifah & Admin Hi Tikrar AQLI* 🌷`;

const TEMPLATE_PANDUAN_MUFRADAT = `*BISMILLAHIRRAHMANIRRAHIM* 📙✨
*PANDUAN RESMI PROGRAM HI MUFRADAT*
_AQLI Digital - Memahami Kosa Kata Al-Qur'an dengan Menyenangkan_

Assalamu'alaikum Warahmatullahi Wabarakatuh, Ukhti Fillah 🌸

Selamat datang di *Hi Mufradat*! Mari maksimalkan pemahaman kosa kata Al-Qur'an agar tadabbur tilawah semakin mendalam:

━━━━━━━━━━━━━━━━━━━
✨ *LANGKAH BELAJAR:*
━━━━━━━━━━━━━━━━━━━
1. Kunjungi platform: https://hiaqli.pro/mufradat
2. Pilih Juz aktif dan target halaman pekan ini.
3. Kerjakan Kuis Makna Kata per ayat (tersedia pilihan ganda, susun kata, & tebak terjemah).
4. Target minimal: Tuntaskan *1 Halaman per pekan* untuk menjaga ritme belajar.
5. Panjat Leaderboard Papan Juara dan ikuti sesi *Mabar Al-Qur'an* bersama thalibah lainnya!

_Barakallahu fiikum wa jazakillahu khairan._
— *Tim Musyrifah Hi Mufradat AQLI* 🌿`;

const TEMPLATE_PENGINGAT_HARIAN = `Assalamu'alaikum Warahmatullahi Wabarakatuh Ukhti fillah 🌸

Pengingat latihan hafalan hari ini di https://hiaqli.pro/tikrar . Yuk luangkan 10-15 menit untuk murajaah dan simak audio makhraj hari ini.

Istiqomah walau satu ayat, semoga menjadi amal jariyah yang terus mengalir. Semangat! ✨`;

export default function AdminGroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'groups' | 'logs'>('groups');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tikrar' | 'mufradat' | 'ngaji'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [watzapStatus, setWatzapStatus] = useState<any>(null);
  const [watzapGroups, setWatzapGroups] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);
  const [logSearch, setLogSearch] = useState('');

  // Modals state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [customWatzapId, setCustomWatzapId] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Members modal
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersList, setMembersList] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Direct message modal
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [directRecipient, setDirectRecipient] = useState<MemberItem | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);

  // Edit group modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGroupValues, setEditingGroupValues] = useState<{
    id: string;
    sourceTable: 'halaqahs' | 'mufradat_groups';
    name: string;
    whatsapp_group_link: string;
    whatsapp_group_id: string;
    musyrifah: string;
    schedule: string;
    zoom_link: string;
  }>({
    id: '',
    sourceTable: 'halaqahs',
    name: '',
    whatsapp_group_link: '',
    whatsapp_group_id: '',
    musyrifah: '',
    schedule: '',
    zoom_link: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setRefreshing(true);
      const res = await authFetch('/api/admin/groups');
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
        setWatzapStatus(data.watzap_status || null);
        setWatzapGroups(data.watzap_groups || []);
        setRecentLogs(data.recent_logs || []);
      } else {
        toast({
          title: "Gagal memuat data",
          description: data.error || "Terjadi kesalahan saat memuat daftar grup.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Koneksi Error",
        description: err.message || "Gagal menghubungi server.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const matchCat = categoryFilter === 'all' || g.program_category === categoryFilter;
      const matchSearch = searchQuery === '' || 
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.musyrifah && g.musyrifah.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [groups, categoryFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
    return {
      all: groups.length,
      tikrar: groups.filter(g => g.program_category === 'tikrar').length,
      mufradat: groups.filter(g => g.program_category === 'mufradat').length,
      ngaji: groups.filter(g => g.program_category === 'ngaji').length,
      members: totalMembers
    };
  }, [groups]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (!logSearch.trim()) return recentLogs;
    const q = logSearch.toLowerCase();
    return recentLogs.filter(l => 
      l.recipient?.toLowerCase().includes(q) ||
      l.message?.toLowerCase().includes(q) ||
      l.type?.toLowerCase().includes(q)
    );
  }, [recentLogs, logSearch]);

  // Open Broadcast Modal
  const handleOpenBroadcast = (group: GroupItem) => {
    setSelectedGroup(group);
    setBroadcastMessage(
      group.program_category === 'tikrar' 
        ? TEMPLATE_PANDUAN_TIKRAR 
        : group.program_category === 'mufradat' 
        ? TEMPLATE_PANDUAN_MUFRADAT 
        : ''
    );
    setCustomWatzapId(group.whatsapp_group_id || '');
    setBroadcastModalOpen(true);
  };

  // Send Broadcast via WatZap
  const handleSendBroadcast = async () => {
    if (!selectedGroup) return;
    if (!broadcastMessage.trim()) {
      toast({ title: "Pesan Kosong", description: "Silakan masukkan teks pesan broadcast.", variant: "destructive" });
      return;
    }
    if (!customWatzapId.trim()) {
      toast({ 
        title: "Group ID Belum Diisi", 
        description: "Silakan masukkan WatZap Group ID untuk grup ini atau pilih dari daftar grup yang terhubung.", 
        variant: "destructive" 
      });
      return;
    }

    setIsSendingBroadcast(true);
    try {
      const res = await authFetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_group_message',
          groupId: selectedGroup.id,
          groupTitle: selectedGroup.name,
          programType: selectedGroup.program_type,
          watzapGroupId: customWatzapId.trim(),
          message: broadcastMessage
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Broadcast Terkirim! ✅",
          description: `Pesan sukses terkirim ke WhatsApp ${selectedGroup.name}.`
        });
        setBroadcastModalOpen(false);
        loadData();
      } else {
        toast({
          title: "Gagal Mengirim Broadcast",
          description: data.error || "Terjadi kesalahan pada gateway WhatsApp.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error Jaringan",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Open View Members
  const handleOpenMembers = async (group: GroupItem) => {
    setSelectedGroup(group);
    setMembersModalOpen(true);
    setLoadingMembers(true);
    setMemberSearch('');
    try {
      const res = await authFetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_members',
          groupId: group.id,
          sourceTable: group.source_table
        })
      });
      const data = await res.json();
      if (data.success) {
        setMembersList(data.members || []);
      } else {
        toast({ title: "Gagal memuat anggota", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingMembers(false);
    }
  };

  // Filtered members in modal
  const filteredMembers = useMemo(() => {
    return membersList.filter(m => {
      const s = memberSearch.toLowerCase();
      return (m.full_name && m.full_name.toLowerCase().includes(s)) ||
        (m.username && m.username.toLowerCase().includes(s)) ||
        (m.phone && m.phone.includes(s)) ||
        (m.whatsapp && m.whatsapp.includes(s));
    });
  }, [membersList, memberSearch]);

  // Open Direct Message modal
  const handleOpenDirect = (member: MemberItem) => {
    setDirectRecipient(member);
    setDirectMessageText(`Assalamu'alaikum Ukhti ${member.full_name || member.username} 🌸\n\n`);
    setDirectModalOpen(true);
  };

  // Send Direct Message via WatZap
  const handleSendDirect = async () => {
    if (!directRecipient) return;
    const phone = directRecipient.whatsapp || directRecipient.phone;
    if (!phone) {
      toast({ title: "Nomor Kosong", description: "Peserta tidak memiliki nomor WhatsApp yang tersimpan.", variant: "destructive" });
      return;
    }
    if (!directMessageText.trim()) {
      toast({ title: "Pesan Kosong", description: "Silakan ketik pesan japri.", variant: "destructive" });
      return;
    }

    setIsSendingDirect(true);
    try {
      const res = await authFetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_direct_message',
          userId: directRecipient.id,
          userName: directRecipient.full_name || directRecipient.username,
          phone: phone,
          message: directMessageText
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Pesan Japri Terkirim! ✅", description: `Pesan sukses terkirim ke ${phone}.` });
        setDirectModalOpen(false);
        loadData();
      } else {
        toast({ title: "Gagal Kirim", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Open Edit Group modal
  const handleOpenEdit = (group: GroupItem) => {
    setEditingGroupValues({
      id: group.id,
      sourceTable: group.source_table,
      name: group.name,
      whatsapp_group_link: group.whatsapp_group_link || '',
      whatsapp_group_id: group.whatsapp_group_id || '',
      musyrifah: group.musyrifah || '',
      schedule: group.schedule || '',
      zoom_link: group.zoom_link || ''
    });
    setEditModalOpen(true);
  };

  // Save Edit Group
  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await authFetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_group',
          ...editingGroupValues
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Berhasil Diperbarui! ✅", description: "Data grup berhasil disimpan." });
        setEditModalOpen(false);
        loadData();
      } else {
        toast({ title: "Gagal Menyimpan", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Disalin!", description: "Teks berhasil disalin ke clipboard." });
  };

  return (
    <div className="max-w-6xl mx-auto pb-28 space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-primary font-bold">Dashboard Admin</Link>
            <span>/</span>
            <span className="text-primary font-bold">Grup & Robot WhatsApp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-emerald-600" />
            Daftar Grup & Robot WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kirim pengumuman resmi ke grup peserta (Hi Tikrar vs Hi Mufradat), kirim pesan japri via gateway, dan pantau log pengiriman.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* WatZap Gateway Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-50 text-xs font-medium">
            <Radio className={cn("w-3.5 h-3.5 animate-pulse", watzapStatus?.configured ? "text-emerald-500" : "text-amber-500")} />
            <span>
              {watzapStatus?.configured ? (
                <>WatZap: <span className="font-bold text-emerald-700">{watzapStatus?.watzap?.senderNumber ? `+${watzapStatus.watzap.senderNumber}` : 'Terkoneksi'}</span></>
              ) : (
                <span className="text-amber-700 font-semibold">WatZap: Fallback / Link WA</span>
              )}
            </span>
          </div>

          <Button 
            onClick={loadData} 
            disabled={refreshing} 
            variant="outline" 
            size="sm" 
            className="rounded-xl gap-1.5 font-bold text-xs h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-emerald-600")} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => { setCategoryFilter('all'); setActiveTab('groups'); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            categoryFilter === 'all' && activeTab === 'groups'
              ? "bg-primary/5 border-primary shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Semua Grup</span>
            <Layers className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{counts.all}</p>
        </button>

        <button
          onClick={() => { setCategoryFilter('tikrar'); setActiveTab('groups'); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            categoryFilter === 'tikrar' && activeTab === 'groups'
              ? "bg-emerald-50 border-emerald-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Hi Tikrar</span>
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1">{counts.tikrar}</p>
        </button>

        <button
          onClick={() => { setCategoryFilter('mufradat'); setActiveTab('groups'); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            categoryFilter === 'mufradat' && activeTab === 'groups'
              ? "bg-amber-50 border-amber-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Hi Mufradat</span>
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">{counts.mufradat}</p>
        </button>

        <button
          onClick={() => { setCategoryFilter('ngaji'); setActiveTab('groups'); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            categoryFilter === 'ngaji' && activeTab === 'groups'
              ? "bg-blue-50 border-blue-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Hi Ngaji</span>
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-900 mt-1">{counts.ngaji}</p>
        </button>

        <div className="p-3 rounded-2xl border bg-white border-slate-200 text-left col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Anggota</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{counts.members} <span className="text-xs font-normal text-slate-400">orang</span></p>
        </div>
      </div>

      {/* Safety Alert Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-amber-50 to-blue-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary text-white rounded-xl shadow-sm mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Perhatian Sasaran Broadcast WhatsApp</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Program <strong className="text-emerald-800">Hi Tikrar</strong> (Target Hafalan Harian) memiliki grup terpisah dari <strong className="text-amber-800">Hi Mufradat</strong> (Kuis Kosa Kata). Pastikan selalu memilih template dan grup yang sesuai agar informasi tepat sasaran.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">TIKRAR</Badge>
          <span className="text-xs text-slate-400">VS</span>
          <Badge className="bg-amber-600 text-white font-bold text-[10px]">MUFRADAT</Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab('groups')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === 'groups'
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Layers className="w-4 h-4" />
          Daftar Grup ({counts.all})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === 'logs'
              ? "border-primary text-primary bg-primary/5 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Clock className="w-4 h-4" />
          Monitor Pesan Terkirim ({recentLogs.length})
        </button>
      </div>

      {/* TAB 1: GROUPS */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('all')}
                className={cn("h-8 px-3 rounded-xl text-xs font-bold", categoryFilter === 'all' && "bg-primary hover:bg-primary/90 text-white")}
              >
                Semua ({counts.all})
              </Button>
              <Button
                variant={categoryFilter === 'tikrar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('tikrar')}
                className={cn("h-8 px-3 rounded-xl text-xs font-bold", categoryFilter === 'tikrar' && "bg-emerald-700 hover:bg-emerald-800 text-white")}
              >
                Hi Tikrar ({counts.tikrar})
              </Button>
              <Button
                variant={categoryFilter === 'mufradat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('mufradat')}
                className={cn("h-8 px-3 rounded-xl text-xs font-bold", categoryFilter === 'mufradat' && "bg-amber-700 hover:bg-amber-800 text-white")}
              >
                Hi Mufradat ({counts.mufradat})
              </Button>
              <Button
                variant={categoryFilter === 'ngaji' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter('ngaji')}
                className={cn("h-8 px-3 rounded-xl text-xs font-bold", categoryFilter === 'ngaji' && "bg-blue-700 hover:bg-blue-800 text-white")}
              >
                Hi Ngaji ({counts.ngaji})
              </Button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama grup atau musyrifah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Group List Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memuat data grup...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl bg-white">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada grup ditemukan</p>
              <p className="text-xs text-slate-400">Coba ubah filter kategori atau kata kunci pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGroups.map((group) => {
                const isTikrar = group.program_category === 'tikrar';
                const isMufradat = group.program_category === 'mufradat';

                return (
                  <Card 
                    key={group.id} 
                    className={cn(
                      "border rounded-2xl overflow-hidden transition-all hover:shadow-md flex flex-col justify-between bg-white",
                      isTikrar && "border-emerald-200/80 bg-gradient-to-b from-emerald-50/30 to-white",
                      isMufradat && "border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white",
                      !isTikrar && !isMufradat && "border-slate-200"
                    )}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTikrar ? (
                              <Badge className="bg-emerald-600 text-white font-black text-[9px] border-none">
                                📖 HI TIKRAR
                              </Badge>
                            ) : isMufradat ? (
                              <Badge className="bg-amber-600 text-white font-black text-[9px] border-none">
                                📙 HI MUFRADAT
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-600 text-white font-black text-[9px] border-none">
                                📚 HI NGAJI
                              </Badge>
                            )}

                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {group.member_count} Thalibah
                            </span>
                          </div>

                          <CardTitle className="text-base font-bold text-slate-900 leading-snug pt-1 truncate">
                            {group.name}
                          </CardTitle>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(group)}
                          className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-200 rounded-xl gap-1 shrink-0 bg-white"
                          title="Edit Pengaturan & Jadwal Grup"
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          <span>Atur</span>
                        </Button>
                      </div>

                      <div className="pt-2 text-xs text-slate-600 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Jadwal: <strong className="text-slate-800">{group.schedule || 'Setiap Hari'}</strong></span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Musyrifah: <strong className="text-slate-800">{group.musyrifah || 'Belum diisi'}</strong></span>
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-2 space-y-3">
                      {/* WhatsApp Info */}
                      <div className="bg-slate-50 border rounded-xl p-2.5 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Link Grup WA:</span>
                          {group.whatsapp_group_link ? (
                            <a 
                              href={group.whatsapp_group_link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="font-bold text-emerald-700 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                            >
                              Buka Link <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Belum diisi</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">WatZap ID:</span>
                          <span className="font-mono text-[10px] text-slate-700 bg-white px-1.5 py-0.5 rounded border truncate max-w-[220px]">
                            {group.whatsapp_group_id || 'Belum di-mapping'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMembers(group)}
                          className="rounded-xl font-bold text-xs h-9 border-slate-200 hover:bg-slate-50 gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-600" />
                          Lihat Anggota
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenBroadcast(group)}
                          className={cn(
                            "rounded-xl font-bold text-xs h-9 text-white gap-1.5 shadow-xs",
                            isTikrar && "bg-emerald-700 hover:bg-emerald-800",
                            isMufradat && "bg-amber-700 hover:bg-amber-800",
                            !isTikrar && !isMufradat && "bg-primary hover:bg-primary/90"
                          )}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Broadcast Pesan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOGS MONITOR */}
      {activeTab === 'logs' && (
        <Card className="border rounded-2xl shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-5 border-b bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Monitor Pengiriman Pesan WhatsApp
                </CardTitle>
                <CardDescription className="text-xs">
                  Riwayat pesan broadcast dan pesan japri yang dikirimkan oleh sistem atau robot WA.
                </CardDescription>
              </div>

              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari penerima atau isi..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-white"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 italic">
                Belum ada data pengiriman pesan tercatat.
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'sent' || log.status === 'success';
                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSuccess ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px] gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 border-none font-bold text-[9px] gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Gagal
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-[9px] font-mono">
                            {log.type}
                          </Badge>

                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="text-slate-400">Tujuan:</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 text-xs">
                            {log.recipient}
                          </span>
                        </div>

                        <p className="text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border font-sans text-xs whitespace-pre-wrap leading-relaxed">
                          {log.message}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(log.message)}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Salin
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: BROADCAST KE GRUP */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <Send className="w-5 h-5 text-emerald-600" />
              Kirim Broadcast Pesan ke Grup
            </DialogTitle>
            <DialogDescription>
              Tinjau target grup dan pilih template pesan sebelum mengirim ke WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4 pt-2">
              {/* Target Confirmation Banner */}
              <div className={cn(
                "p-4 rounded-2xl border flex flex-col gap-2",
                selectedGroup.program_category === 'tikrar' && "bg-emerald-50/80 border-emerald-300 text-emerald-950",
                selectedGroup.program_category === 'mufradat' && "bg-amber-50/80 border-amber-300 text-amber-950",
                selectedGroup.program_category !== 'tikrar' && selectedGroup.program_category !== 'mufradat' && "bg-slate-50 border-slate-200 text-slate-900"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-75">
                    KONFIRMASI SASARAN GRUP:
                  </span>
                  <Badge className={cn(
                    "font-black text-[9px] border-none",
                    selectedGroup.program_category === 'tikrar' && "bg-emerald-700 text-white",
                    selectedGroup.program_category === 'mufradat' && "bg-amber-700 text-white"
                  )}>
                    {selectedGroup.program_category === 'tikrar' ? '📖 PROGRAM HI TIKRAR' : '📙 PROGRAM HI MUFRADAT'}
                  </Badge>
                </div>

                <div className="text-base font-bold text-slate-900">
                  {selectedGroup.name}
                </div>

                <p className="text-xs opacity-80 leading-relaxed">
                  {selectedGroup.program_category === 'tikrar' 
                    ? '✅ Ini adalah grup Hi Tikrar (Target Hafalan & Setoran). Gunakan panduan hafalan untuk grup ini.'
                    : '⚠️ Ini adalah grup Hi Mufradat (Kuis Kosa Kata harian). Gunakan panduan kosa kata untuk grup ini.'}
                </p>
              </div>

              {/* WatZap Group ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">WatZap Group ID Tujuan</Label>
                  {watzapGroups.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">Pilih dari grup WA yang aktif:</span>
                  )}
                </div>

                {watzapGroups.length > 0 && (
                  <Select 
                    value={customWatzapId} 
                    onValueChange={(val) => setCustomWatzapId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="-- Pilih dari daftar grup WatZap --" />
                    </SelectTrigger>
                    <SelectContent>
                      {watzapGroups.map((wg: any) => (
                        <SelectItem key={wg.id} value={wg.id} className="text-xs">
                          {wg.name} ({wg.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  placeholder="e.g. 120363028192839123@g.us atau ID WatZap"
                  value={customWatzapId}
                  onChange={(e) => setCustomWatzapId(e.target.value)}
                  className="font-mono text-xs rounded-xl"
                />
              </div>

              {/* Quick Template Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Pilihan Template Cepat
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastMessage(TEMPLATE_PANDUAN_TIKRAR)}
                    className="text-xs font-bold rounded-xl h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    📖 Panduan Hi Tikrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastMessage(TEMPLATE_PANDUAN_MUFRADAT)}
                    className="text-xs font-bold rounded-xl h-8 border-amber-300 text-amber-800 hover:bg-amber-50"
                  >
                    📙 Panduan Hi Mufradat
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastMessage(TEMPLATE_PENGINGAT_HARIAN)}
                    className="text-xs font-bold rounded-xl h-8"
                  >
                    ⏰ Pengingat Latihan Harian
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(broadcastMessage)}
                    className="text-xs font-bold rounded-xl h-8 gap-1 ml-auto text-slate-500"
                  >
                    <Copy className="w-3 h-3" /> Salin Teks
                  </Button>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Isi Pesan Broadcast</Label>
                <Textarea
                  rows={9}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Ketik pesan broadcast di sini..."
                  className="font-sans text-xs leading-relaxed rounded-xl"
                />
              </div>

              {selectedGroup.whatsapp_group_link && (
                <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-600">Atau kirim manual lewat WhatsApp Web:</span>
                  <a
                    href={selectedGroup.whatsapp_group_link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    Buka Link Grup WA <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBroadcastModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSendBroadcast}
              disabled={isSendingBroadcast}
              className="rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
            >
              {isSendingBroadcast ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Mengirim ke WhatsApp...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Kirim Broadcast Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DAFTAR ANGGOTA */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-emerald-600" />
              Anggota Grup: {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftar thalibah yang terdaftar dalam grup ini. Anda dapat mengirim pesan japri langsung.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama atau nomor HP..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            {loadingMembers ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <p className="text-xs font-bold text-slate-400">Memuat anggota grup...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Tidak ada anggota ditemukan dalam grup ini.
              </div>
            ) : (
              <div className="divide-y max-h-[50vh] overflow-y-auto border rounded-2xl">
                {filteredMembers.map((member) => {
                  const rawPhone = member.whatsapp || member.phone || '';
                  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                  const waUrl = cleanPhone 
                    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(`Assalamu'alaikum Ukhti ${member.full_name || member.username} 🌸`)}`
                    : null;

                  return (
                    <div key={member.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{member.full_name || member.username}</span>
                          {member.tikrar_current_page && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                              Hal. {member.tikrar_current_page}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-500 font-mono text-[11px]">
                          {rawPhone || 'Nomor HP belum tersimpan'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-[11px]"
                          >
                            <Phone className="w-3 h-3" />
                            Chat WA
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No phone</span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDirect(member)}
                          className="h-8 px-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Gateway
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: JAPRI PESERTA VIA GATEWAY */}
      <Dialog open={directModalOpen} onOpenChange={setDirectModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Send className="w-4 h-4 text-emerald-600" />
              Kirim Pesan Japri: {directRecipient?.full_name || directRecipient?.username}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pesan akan dikirim langsung ke nomor WhatsApp peserta melalui WatZap Gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500 font-medium">Penerima:</span> <strong className="text-slate-800">{directRecipient?.full_name || directRecipient?.username}</strong></p>
              <p><span className="text-slate-500 font-medium">Nomor WhatsApp:</span> <span className="font-mono font-bold text-emerald-700">{directRecipient?.whatsapp || directRecipient?.phone}</span></p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Isi Pesan</Label>
              <Textarea
                rows={6}
                value={directMessageText}
                onChange={(e) => setDirectMessageText(e.target.value)}
                placeholder="Tulis pesan japri..."
                className="text-xs rounded-xl font-sans"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDirectModalOpen(false)} className="rounded-xl font-bold text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSendDirect}
              disabled={isSendingDirect}
              className="rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              {isSendingDirect ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Kirim Japri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT GROUP DETAILS */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              Atur Data Grup: {editingGroupValues.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui link WhatsApp, WatZap Group ID, nama musyrifah, atau jadwal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Nama Grup / Kelas</Label>
              <Input
                value={editingGroupValues.name}
                onChange={(e) => setEditingGroupValues({ ...editingGroupValues, name: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Link Undangan Grup WhatsApp</Label>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                value={editingGroupValues.whatsapp_group_link}
                onChange={(e) => setEditingGroupValues({ ...editingGroupValues, whatsapp_group_link: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">WatZap Group ID (Untuk Gateway Robot)</Label>
              <Input
                placeholder="e.g. 120363028192839123@g.us"
                value={editingGroupValues.whatsapp_group_id}
                onChange={(e) => setEditingGroupValues({ ...editingGroupValues, whatsapp_group_id: e.target.value })}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Musyrifah</Label>
                <Input
                  placeholder="Nama Musyrifah"
                  value={editingGroupValues.musyrifah}
                  onChange={(e) => setEditingGroupValues({ ...editingGroupValues, musyrifah: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Jadwal</Label>
                <Input
                  placeholder="Contoh: Setiap Hari / Senin-Jumat"
                  value={editingGroupValues.schedule}
                  onChange={(e) => setEditingGroupValues({ ...editingGroupValues, schedule: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {editingGroupValues.sourceTable === 'halaqahs' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Link Zoom / Google Meet</Label>
                <Input
                  placeholder="https://zoom.us/j/..."
                  value={editingGroupValues.zoom_link}
                  onChange={(e) => setEditingGroupValues({ ...editingGroupValues, zoom_link: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)} className="rounded-xl font-bold text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
