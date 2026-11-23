'use client';

import { useState, useMemo } from "react";
import { useUser, db } from "@/db";
import { useCollection } from "@/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  HeartHandshake,
  Target,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Copy,
  Search,
  Filter,
  Sparkles,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = ["SEMUA", "WAKAF", "BEASISWA", "INFAQ", "ZAKAT", "OPERASIONAL"];
const formCategories = ["WAKAF", "BEASISWA", "INFAQ", "ZAKAT", "OPERASIONAL"];

export default function AdminCampaignsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");

  // Delete Alert Dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("INFAQ");
  const [goal, setGoal] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [daysLeft, setDaysLeft] = useState("");
  const [beneficiariesCount, setBeneficiariesCount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  const campaignOptions = useMemo(() => ({
    orderBy: { column: 'created_at', ascending: false }
  }), []);

  const { data: campaigns, isLoading, refresh } = useCollection("campaigns", campaignOptions);
  
  // Fetch donations for real-time stats
  const { data: allDonations } = useCollection("donations", useMemo(() => ({
    filters: [{ column: 'status', operator: '==', value: 'verified' }]
  }), []));

  const donationStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    (allDonations || []).forEach((d: any) => {
      const campTitle = d.campaign_title || "Infaq Umum";
      if (!stats[campTitle]) stats[campTitle] = { total: 0, count: 0 };
      stats[campTitle].total += d.amount || 0;
      stats[campTitle].count += 1;
    });
    return stats;
  }, [allDonations]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("INFAQ");
    setGoal("");
    setImageUrl("");
    setImageFile(null);
    setDaysLeft("");
    setBeneficiariesCount("");
    setBankName("");
    setBankAccountNumber("");
    setBankAccountHolder("");
    setContactPerson("");
    setEditingId(null);
    setShowForm(false);
  };

  const populateForm = (camp: any) => {
    setTitle(camp.title || "");
    setDescription(camp.description || "");
    setCategory(camp.category || "INFAQ");
    setGoal(camp.goal?.toString() || "");
    setImageUrl(camp.image_url || "");
    setDaysLeft(camp.days_left?.toString() || "0");
    setBeneficiariesCount(camp.beneficiaries_count?.toString() || "0");
    setBankName(camp.bank_name || "");
    setBankAccountNumber(camp.bank_account_number || "");
    setBankAccountHolder(camp.bank_account_holder || "");
    setContactPerson(camp.contact_person || "");
    setEditingId(camp.id);
    setImageFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Judul kampanye wajib diisi." });
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      // Handle Image Upload
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await db.storage
          .from('gambar')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error("Storage Upload Error:", uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = db.storage
          .from('gambar')
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        goal: parseFloat(goal) || 0,
        image_url: finalImageUrl || null,
        days_left: parseInt(daysLeft) || 0,
        beneficiaries_count: parseInt(beneficiariesCount) || 0,
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_holder: bankAccountHolder.trim(),
        contact_person: contactPerson.trim(),
        is_active: true,
      };

      if (editingId) {
        const { error } = await db.from("campaigns").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Kampanye Diperbarui", description: `"${title}" berhasil disimpan.` });
      } else {
        const { error } = await db.from("campaigns").insert(payload);
        if (error) throw error;
        toast({ title: "Kampanye Dibuat", description: `"${title}" berhasil ditambahkan.` });
      }

      resetForm();
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan.", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await db.from("campaigns").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Kampanye Dihapus", description: `"${deleteTarget.name}" telah dihapus.` });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus.", description: e.message });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await db.from("campaigns").update({ is_active: !currentStatus }).eq("id", id);
      if (error) throw error;
      toast({ title: currentStatus ? "Kampanye Dinonaktifkan" : "Kampanye Diaktifkan" });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal mengubah status." });
    }
  };

  const copyPromoMessage = (camp: any) => {
    const totalCollected = donationStats[camp.title]?.total || 0;
    const progress = camp.goal > 0 ? (totalCollected / camp.goal) * 100 : 0;
    const message = `*PROGRAM INFAQ HI BERBAGI* 🌿\n\n*${camp.title.toUpperCase()}*\n\n🕌 ${camp.description}\n\n🎯 *Target:* Rp ${(camp.goal || 0).toLocaleString('id-ID')}\n*Terkumpul:* Rp ${totalCollected.toLocaleString('id-ID')} (${Math.round(progress)}%)\n\nSalurkan infaq terbaik Ukhti melalui:\n🔗 https://hiaqli.pro/berbagi\n\n_Semoga menjadi amal jariyah yang tak terputus. Jazakallahu Khairan_`;

    navigator.clipboard.writeText(message);
    toast({ title: "Pesan Promosi Disalin", description: "Format WhatsApp siap dibagikan ke grup." });
  };

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => {
      const matchesSearch = !search ||
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "SEMUA" || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [campaigns, search, selectedCategory]);

  const stats = useMemo(() => {
    const total = campaigns?.length || 0;
    const active = campaigns?.filter(c => c.is_active).length || 0;
    const totalGoal = campaigns?.reduce((acc, c) => acc + (c.goal || 0), 0) || 0;
    const totalCollected = Object.values(donationStats).reduce((acc, s) => acc + s.total, 0);
    return { total, active, totalGoal, totalCollected };
  }, [campaigns, donationStats]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Kampanye Infaq...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mt-2">
        <div>
          <h1 className="text-2xl font-black font-headline tracking-tight text-primary uppercase">
            Kampanye Infaq
          </h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Program Hi Berbagi &bull; Pengelolaan Donasi & Kampanye Kebaikan
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-primary hover:bg-[#520d2f] text-white font-black text-xs gap-2 uppercase tracking-wider rounded-xl shadow-md h-11 px-5"
            >
              <Plus className="w-4 h-4" /> Tambah Kampanye
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={resetForm}
              className="font-bold text-xs gap-2 rounded-xl h-11 border-slate-300"
            >
              <X className="w-4 h-4" /> Batal Form
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Program</p>
          <p className="text-2xl font-black mt-1 text-slate-800">{stats.total}</p>
          <p className="text-[10px] font-bold text-primary mt-1">{stats.active} Aktif Berjalan</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Dana</p>
          <p className="text-2xl font-black mt-1 text-slate-800">Rp {(stats.totalGoal / 1000000).toFixed(1)}Jt</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">Akumulasi Seluruh Program</p>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl p-4 border-l-4 border-emerald-500">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Terkumpul Nyata</p>
          <p className="text-2xl font-black mt-1 text-emerald-600">Rp {stats.totalCollected.toLocaleString('id-ID')}</p>
          <p className="text-[10px] font-bold text-emerald-700 mt-1">Dari Donatur Terverifikasi</p>
        </Card>
        <Card className="border-none shadow-sm bg-primary text-white rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Penyaluran</p>
          <p className="text-2xl font-black mt-1">Hi Berbagi</p>
          <p className="text-[10px] font-bold text-amber-200 mt-1">Transparan & Amanah</p>
        </Card>
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <Card className="border-none shadow-2xl overflow-hidden bg-white mx-1 rounded-2xl animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-primary text-white py-5 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
              {editingId ? "Edit Rincian Kampanye" : "Buat Kampanye Infaq Baru"}
            </CardTitle>
            <CardDescription className="text-xs text-rose-200">
              Isi data lengkap program agar donatur dapat melihat informasi terpercaya di halaman Hi Berbagi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Judul Kampanye *
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Beasiswa Itqan Thalibah Dhuafa"
                  className="h-12 font-bold border-2 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Kategori Program
                </Label>
                <div className="flex flex-wrap gap-2">
                  {formCategories.map((cat) => (
                    <Badge
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "cursor-pointer text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all",
                        category === cat
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Deskripsi Kampanye *
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan tujuan penggalangan dana, penerima manfaat, dan keutamaan berinfaq di program ini..."
                rows={4}
                className="font-medium border-2 rounded-xl text-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Target Dana (Rp)
                </Label>
                <Input
                  type="number"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="50000000"
                  className="h-12 font-bold border-2 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Estimasi Sisa Hari
                </Label>
                <Input
                  type="number"
                  value={daysLeft}
                  onChange={(e) => setDaysLeft(e.target.value)}
                  placeholder="30"
                  className="h-12 font-bold border-2 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Estimasi Penerima Manfaat
                </Label>
                <Input
                  type="number"
                  value={beneficiariesCount}
                  onChange={(e) => setBeneficiariesCount(e.target.value)}
                  placeholder="50"
                  className="h-12 font-bold border-2 rounded-xl"
                />
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-primary">
                Informasi Rekening Tujuan & Kontak
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Nama Bank</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BSI (Bank Syariah Indonesia)"
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Nomor Rekening</Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="7209432468"
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Atas Nama Rekening</Label>
                  <Input
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    placeholder="Dewi Febriani"
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">No. WA / CP</Label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="08123456789"
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Foto / Banner Program
              </Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="h-12 border-2 rounded-xl text-xs py-3 cursor-pointer file:bg-primary file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:font-bold file:-mt-1 hover:file:bg-[#520d2f]"
                />
                {imageUrl && !imageFile && (
                  <div className="w-14 h-14 rounded-xl border overflow-hidden shrink-0">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={resetForm}
                className="font-bold text-xs rounded-xl h-12 px-6"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-primary hover:bg-[#520d2f] text-white font-black uppercase tracking-wider gap-2 h-12 flex-1 rounded-xl shadow-lg"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                {editingId ? "Simpan Perubahan Kampanye" : "Terbitkan Kampanye Sekarang"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <Badge
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "cursor-pointer text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap",
                selectedCategory === cat
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {cat}
            </Badge>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kampanye..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 text-xs font-bold rounded-xl"
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <Card className="border-none shadow-xl overflow-hidden bg-white mx-1 rounded-2xl">
        <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
            <Target className="w-4 h-4 text-primary" /> Daftar Program Kampanye
          </CardTitle>
          <Badge variant="outline" className="bg-white text-xs font-bold">
            {filteredCampaigns.length} Program
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Kampanye</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Kategori</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Target</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Terkumpul</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Penerima</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HeartHandshake className="w-12 h-12 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">Belum ada program kampanye yang sesuai</p>
                        <p className="text-xs text-muted-foreground">Klik &quot;Tambah Kampanye&quot; untuk membuat program baru</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((camp: any) => {
                    const totalCollected = donationStats[camp.title]?.total || 0;
                    const donorsCount = donationStats[camp.title]?.count || 0;
                    const progress = camp.goal > 0 ? Math.round((totalCollected / camp.goal) * 100) : 0;

                    return (
                      <TableRow key={camp.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3 max-w-[280px]">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                              {camp.image_url ? (
                                <img src={camp.image_url} alt={camp.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <ImageIcon className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black text-primary uppercase truncate">
                                {camp.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {camp.description?.slice(0, 50)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#D4AF37] text-slate-900 font-black text-[9px] border-none px-2 py-0.5">
                            {camp.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black text-slate-800">
                            Rp {(camp.goal || 0).toLocaleString('id-ID')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-600">
                              Rp {totalCollected.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground">
                              {progress}% &bull; {donorsCount} Donatur
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black text-slate-800">
                            {(camp.beneficiaries_count || 0).toLocaleString('id-ID')} Orang
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            onClick={() => handleToggleActive(camp.id, camp.is_active)}
                            className={cn(
                              "text-[8px] font-black border-none cursor-pointer px-2 py-0.5 transition-all",
                              camp.is_active
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            )}
                          >
                            {camp.is_active ? "AKTIF" : "NONAKTIF"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 font-black text-[9px] gap-1 border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                              onClick={() => copyPromoMessage(camp)}
                            >
                              <Copy className="w-3 h-3" /> PROMOSI
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg"
                              onClick={() => populateForm(camp)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              onClick={() => setDeleteTarget({ id: camp.id, name: camp.title })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* AlertDialog for Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-rose-600 uppercase">
              Hapus Kampanye Infaq?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kampanye{" "}
              <strong className="text-slate-900">&quot;{deleteTarget?.name}&quot;</strong>?
              Tindakan ini permanen dan akan menghapus program dari daftar tampilan donatur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Ya, Hapus Kampanye
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
