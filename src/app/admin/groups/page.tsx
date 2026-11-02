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
  ArrowLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

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

export default function AdminGroupsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'groups' | 'logs' | 'direct'>('groups');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tikrar' | 'mufradat' | 'ngaji'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [watzapStatus, setWatzapStatus] = useState<any>(null);
  const [watzapGroups, setWatzapGroups] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);

  // Modals state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [customWatzapId, setCustomWatzapId] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
  }>({
    id: '',
    sourceTable: 'halaqahs',
    name: '',
    whatsapp_group_link: '',
    whatsapp_group_id: '',
    musyrifah: '',
    schedule: ''
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
    return {
      all: groups.length,
      tikrar: groups.filter(g => g.program_category === 'tikrar').length,
      mufradat: groups.filter(g => g.program_category === 'mufradat').length,
      ngaji: groups.filter(g => g.program_category === 'ngaji').length,
    };
  }, [groups]);

  // Open Broadcast Modal
  const handleOpenBroadcast = (group: GroupItem) => {
    setSelectedGroup(group);
    setBroadcastMessage(group.program_category === 'tikrar' ? TEMPLATE_PANDUAN_TIKRAR : '');
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
        loadData(); // refresh logs
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
      schedule: group.schedule || ''
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

  // Helper copy text
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast({ title: "Disalin!", description: "Teks berhasil disalin ke clipboard." });
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-bold text-muted-foreground hover:text-[#800000] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard Admin
            </Link>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-bold text-[#800000]">Manajemen Grup & Monitor WhatsApp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-emerald-600" />
            Daftar Grup & Monitor Pesan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Pastikan pesan broadcast tepat sasaran (Hi Tikrar vs Hi Mufradat), pantau log pesan, dan kirim japri ke thalibah.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Safety Alert Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-blue-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900">Perhatian Khusus Sasaran Grup</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Program <strong className="text-emerald-800">Hi Tikrar</strong> (Target Hafalan & Setoran Harian) memiliki grup terpisah dari <strong className="text-amber-800">Hi Mufradat</strong> (Kuis Kosa Kata). Selalu pastikan memilih tombol broadcast pada grup yang tepat.
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
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
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
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setCategoryFilter('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  categoryFilter === 'all'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua ({counts.all})
              </button>
              <button
                onClick={() => setCategoryFilter('tikrar')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  categoryFilter === 'tikrar'
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-800 hover:bg-emerald-100/50"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Hi Tikrar ({counts.tikrar})
              </button>
              <button
                onClick={() => setCategoryFilter('mufradat')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  categoryFilter === 'mufradat'
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-amber-800 hover:bg-amber-100/50"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Hi Mufradat ({counts.mufradat})
              </button>
              <button
                onClick={() => setCategoryFilter('ngaji')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  categoryFilter === 'ngaji'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-blue-800 hover:bg-blue-100/50"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Hi Ngaji & Lainnya ({counts.ngaji})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari grup atau musyrifah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white"
              />
            </div>
          </div>

          {/* Group List Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memuat data grup...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed rounded-2xl bg-slate-50/50">
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
                      "border overflow-hidden transition-all hover:shadow-md flex flex-col justify-between",
                      isTikrar && "border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white",
                      isMufradat && "border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white",
                      !isTikrar && !isMufradat && "border-slate-200 bg-white"
                    )}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTikrar ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-wide">
                                📖 HI TIKRAR
                              </Badge>
                            ) : isMufradat ? (
                              <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] tracking-wide">
                                📙 HI MUFRADAT
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] tracking-wide">
                                📚 HI NGAJI
                              </Badge>
                            )}

                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {group.member_count} Thalibah
                            </span>
                          </div>

                          <CardTitle className="text-base font-black font-headline text-slate-900 leading-snug pt-1">
                            {group.name}
                          </CardTitle>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(group)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-lg"
                          title="Edit Pengaturan Grup"
                        >
                          <Edit3 className="w-4 h-4" />
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
                      {/* WhatsApp Info & IDs */}
                      <div className="bg-white/80 border rounded-xl p-2.5 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Link Grup WA:</span>
                          {group.whatsapp_group_link ? (
                            <a 
                              href={group.whatsapp_group_link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline font-bold flex items-center gap-1"
                            >
                              Buka di WhatsApp <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada link</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">WatZap Group ID:</span>
                          {group.whatsapp_group_id ? (
                            <span className="font-mono text-slate-800 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                              {group.whatsapp_group_id}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Belum diatur
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          onClick={() => handleOpenBroadcast(group)}
                          className={cn(
                            "w-full text-xs font-bold h-9 rounded-xl gap-1.5 text-white shadow-sm",
                            isTikrar && "bg-emerald-700 hover:bg-emerald-800",
                            isMufradat && "bg-amber-600 hover:bg-amber-700",
                            !isTikrar && !isMufradat && "bg-slate-800 hover:bg-slate-900"
                          )}
                        >
                          <Send className="w-3.5 h-3.5" />
                          Broadcast Pesan
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenMembers(group)}
                          className="w-full text-xs font-bold h-9 rounded-xl gap-1.5 border-slate-300 hover:bg-slate-100"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Anggota ({group.member_count})
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
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold font-headline flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Audit Log Pengiriman WhatsApp
                </CardTitle>
                <CardDescription>
                  Semua pesan yang diproses ke WhatsApp grup maupun pesan japri peserta dicatat di sini.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={refreshing}
                className="rounded-xl font-bold text-xs h-8 gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
                Refresh Log
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentLogs.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">Belum ada riwayat log pengiriman</p>
                <p className="text-xs text-slate-400">Pesan yang dikirim melalui sistem akan muncul otomatis di sini.</p>
              </div>
            ) : (
              <div className="divide-y overflow-x-auto">
                {recentLogs.map((log) => {
                  const isSuccess = log.status === 'sent';
                  const isTikrar = log.type?.includes('tikrar');
                  const isMufradat = log.type?.includes('mufradat');

                  return (
                    <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSuccess ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border border-red-300 font-bold text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" /> Gagal
                            </Badge>
                          )}

                          <Badge variant="outline" className="text-[10px] font-mono">
                            {log.type}
                          </Badge>

                          <span className="text-slate-400 text-[11px]">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Tujuan:</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">
                            {log.recipient}
                          </span>
                        </div>

                        <p className="text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border font-mono text-[11px] whitespace-pre-wrap">
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

      {/* ========================================================================= */}
      {/* MODAL 1: BROADCAST PESAN KE GRUP (WITH PROMINENT SAFETY TARGET BANNER)   */}
      {/* ========================================================================= */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-headline font-black flex items-center gap-2 text-slate-900">
              <Send className="w-5 h-5 text-emerald-600" />
              Kirim Broadcast Pesan ke Grup
            </DialogTitle>
            <DialogDescription>
              Tinjau target grup dan format pesan sebelum mengirim.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4 pt-2">
              {/* Target Banner */}
              <div className={cn(
                "p-4 rounded-2xl border-2 flex flex-col gap-2",
                selectedGroup.program_category === 'tikrar' && "bg-emerald-50 border-emerald-400 text-emerald-950",
                selectedGroup.program_category === 'mufradat' && "bg-amber-50 border-amber-400 text-amber-950",
                selectedGroup.program_category !== 'tikrar' && selectedGroup.program_category !== 'mufradat' && "bg-slate-50 border-slate-300 text-slate-900"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-75">
                    KONFIRMASI SASARAN GRUP:
                  </span>
                  <Badge className={cn(
                    "font-black text-[10px]",
                    selectedGroup.program_category === 'tikrar' && "bg-emerald-700 text-white",
                    selectedGroup.program_category === 'mufradat' && "bg-amber-700 text-white"
                  )}>
                    {selectedGroup.program_category === 'tikrar' ? '📖 PROGRAM HI TIKRAR' : '📙 PROGRAM HI MUFRADAT'}
                  </Badge>
                </div>

                <div className="text-base font-black">
                  {selectedGroup.name}
                </div>

                <p className="text-xs opacity-80">
                  {selectedGroup.program_category === 'tikrar' 
                    ? '✅ Ini adalah grup Hi Tikrar (Target Hafalan & Setoran). Pesan panduan hafalan cocok dikirim ke sini.'
                    : '⚠️ Ini adalah grup Hi Mufradat (Kuis Kosa Kata harian). Jangan kirim panduan Tikrar ke grup ini.'}
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
                <p className="text-[11px] text-slate-500">
                  Group ID diperoleh dari gateway WatZap saat nomor bot bergabung ke dalam grup WhatsApp.
                </p>
              </div>

              {/* Quick Template Picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Template Cepat
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastMessage(TEMPLATE_PANDUAN_TIKRAR)}
                    className="text-xs font-bold rounded-xl h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    📖 Sisipkan Panduan Resmi Hi Tikrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastMessage(`Assalamu'alaikum Warahmatullahi Wabarakatuh Ukhti fillah 🌸\n\nPengingat latihan hafalan hari ini di https://hiaqli.pro/tikrar . Yuk luangkan 10-15 menit untuk murajaah dan simak audio makhraj.\n\nSemangat istiqomah! ✨`)}
                    className="text-xs font-bold rounded-xl h-8"
                  >
                    ⏰ Pengingat Latihan Harian
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(broadcastMessage)}
                    className="text-xs font-bold rounded-xl h-8 gap-1 ml-auto"
                  >
                    <Copy className="w-3 h-3" />
                    Salin Teks Saja
                  </Button>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Isi Pesan Broadcast</Label>
                <Textarea
                  rows={10}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Ketik pesan broadcast di sini..."
                  className="font-sans text-xs leading-relaxed rounded-xl"
                />
              </div>

              {/* Quick link to open in WhatsApp Web as alternative */}
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

      {/* ========================================================================= */}
      {/* MODAL 2: DAFTAR ANGGOTA & JAPRI PESERTA                                  */}
      {/* ========================================================================= */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-headline font-black flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-emerald-600" />
              Anggota Grup: {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
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
                    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`
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
                            Japri WA Web
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

      {/* ========================================================================= */}
      {/* MODAL 3: JAPRI PESERTA VIA GATEWAY                                      */}
      {/* ========================================================================= */}
      <Dialog open={directModalOpen} onOpenChange={setDirectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-headline font-black flex items-center gap-2 text-slate-900">
              <Send className="w-4 h-4 text-emerald-600" />
              Kirim Pesan Japri: {directRecipient?.full_name || directRecipient?.username}
            </DialogTitle>
            <DialogDescription>
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
                className="text-xs rounded-xl"
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

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT GROUP DETAILS                                              */}
      {/* ========================================================================= */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-headline font-black flex items-center gap-2 text-slate-900">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              Atur Data Grup: {editingGroupValues.name}
            </DialogTitle>
            <DialogDescription>
              Perbarui link WhatsApp, WatZap Group ID, nama musyrifah, atau jadwal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Nama Grup</Label>
              <Input
                value={editingGroupValues.name}
                onChange={(e) => setEditingGroupValues(prev => ({ ...prev, name: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Link Grup WhatsApp</Label>
              <Input
                placeholder="https://chat.whatsapp.com/..."
                value={editingGroupValues.whatsapp_group_link}
                onChange={(e) => setEditingGroupValues(prev => ({ ...prev, whatsapp_group_link: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">WatZap Group ID (Untuk Broadcast API)</Label>
              <Input
                placeholder="e.g. 120363028192839123@g.us"
                value={editingGroupValues.whatsapp_group_id}
                onChange={(e) => setEditingGroupValues(prev => ({ ...prev, whatsapp_group_id: e.target.value }))}
                className="text-xs font-mono rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Musyrifah</Label>
                <Input
                  value={editingGroupValues.musyrifah}
                  onChange={(e) => setEditingGroupValues(prev => ({ ...prev, musyrifah: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Jadwal Sesi</Label>
                <Input
                  value={editingGroupValues.schedule}
                  onChange={(e) => setEditingGroupValues(prev => ({ ...prev, schedule: e.target.value }))}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)} className="rounded-xl font-bold text-xs">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
