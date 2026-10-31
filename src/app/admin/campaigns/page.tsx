'use client';

import { useState, useMemo } from "react";
import {useUser, db } from "@/db";
import { useCollection } from "@/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  ArrowLeft, Plus, Loader2, Pencil, Trash2, X, Save,
  HeartHandshake, Target, CheckCircle2, XCircle,
  Image as ImageIcon, Copy
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const categories = ["WAKAF", "BEASISWA", "INFAQ", "ZAKAT", "OPERASIONAL"];

export default function AdminCampaignsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!stats[d.campaign_title]) stats[d.campaign_title] = { total: 0, count: 0 };
      stats[d.campaign_title].total += d.amount || 0;
      stats[d.campaign_title].count += 1;
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
        
        const { data: uploadData, error: uploadError } = await db.storage
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Ukhti yakin ingin menghapus kampanye "${name}"?`)) return;

    try {
      const { error } = await db.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Kampanye Dihapus", description: `"${name}" telah dihapus.` });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus.", description: e.message });
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
    const message = `*PROGRAM INFAQ HI BERBAGI* 🌿

*${camp.title.toUpperCase()}*

🕌🌴 ${camp.description}

🎯 *Target:* Rp ${(camp.goal || 0).toLocaleString('id-ID')}
*Terkumpul:* Rp ${totalCollected.toLocaleString('id-ID')} (${Math.round(progress)}%)

Salurkan infaq terbaik Ukhti melalui:
🔗 https://hiaqli.pro/berbagi

_Semoga menjadi amal jariyah yang tak terputus. Jazakallahu Khairan_`;

    navigator.clipboard.writeText(message);
    toast({ title: "Pesan Promosi Disalin", description: "Siap dibagikan ke WhatsApp." });
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-[#800000]" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Kampanye...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-1 mt-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Manajemen Kampanye</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Program Infaq Hi Berbagi</p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-[#800000] hover:bg-[#800000]/90 font-black text-xs gap-2 uppercase tracking-wider">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        )}
      </div>

      {/* Form Tambah/Edit */}
      {showForm && (
        <Card className="border-none shadow-xl overflow-hidden bg-white mx-1">
          <CardHeader className="bg-[#800000] text-white py-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
              {editingId ? "Edit Kampanye" : "Buat Kampanye Baru"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Judul Kampanye *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Beasiswa Itqan Thalibah" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kategori</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Badge
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "cursor-pointer text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all",
                        category === cat ? "bg-[#800000] text-white" : "bg-muted text-muted-foreground hover:bg-[#800000]/10"
                      )}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deskripsi</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan tujuan kampanye..." className="min-h-[100px] font-medium border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Dana (Rp)</Label>
                <Input type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000000" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sisa Hari (0 = Ongoing)</Label>
                <Input type="number" value={daysLeft} onChange={(e) => setDaysLeft(e.target.value)} placeholder="30" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Penerima Manfaat</Label>
                <Input type="number" value={beneficiariesCount} onChange={(e) => setBeneficiariesCount(e.target.value)} placeholder="0" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Bank Pembayaran</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BSI" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No. Rekening</Label>
                <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="720943..." className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Pemilik Rekening</Label>
                <Input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Nama Sesuai Bank" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Person (CP)</Label>
                <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contoh: Admin (0812...)" className="h-12 font-bold border-2 rounded-xl" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Gambar Kampanye</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="h-12 border-2 rounded-xl text-xs py-3 cursor-pointer file:bg-[#800000] file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:font-bold file:-mt-1 hover:file:bg-[#800000]/90"
                    />
                    {imageUrl && !imageFile && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                        <img src={imageUrl} alt="Current" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  {imageUrl && <p className="text-[8px] text-muted-foreground truncate">URL Saat Ini: {imageUrl}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={loading} className="bg-[#800000] hover:bg-[#800000]/90 font-black uppercase tracking-wider gap-2 h-12 flex-1">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                {editingId ? "Simpan Perubahan" : "Buat Kampanye"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="h-12 font-black uppercase tracking-wider gap-2">
                <X className="w-4 h-4" /> Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabel Kampanye */}
      <Card className="border-none shadow-xl overflow-hidden bg-white mx-1">
        <CardHeader className="bg-muted/30 px-6 py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4 text-[#800000]" /> Daftar Kampanye
          </CardTitle>
          <Badge variant="outline" className="bg-white">{campaigns?.length || 0} Program</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="text-[10px] font-black uppercase py-4">Kampanye</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Kategori</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Target</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Terkumpul</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Penerima</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!campaigns || campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic text-sm">
                      Belum ada kampanye. Klik &quot;Tambah&quot; untuk membuat program Infaq baru.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((camp: any) => {
                    const progress = camp.goal > 0 ? Math.round((camp.current / camp.goal) * 100) : 0;
                    return (
                      <TableRow key={camp.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3 max-w-[250px]">
                            <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden border">
                              {camp.image_url ? (
                                <img src={camp.image_url} alt={camp.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full"><ImageIcon className="w-4 h-4 text-muted-foreground/30" /></div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black text-[#800000] uppercase truncate">{camp.title}</span>
                              <span className="text-[9px] text-muted-foreground truncate">{camp.description?.slice(0, 50)}...</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#D4AF37] text-black font-black text-[8px] border-none">{camp.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black">Rp {(camp.goal || 0).toLocaleString('id-ID')}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-600">Rp {(donationStats[camp.title]?.total || 0).toLocaleString('id-ID')}</span>
                            <span className="text-[8px] font-bold text-muted-foreground">{camp.goal > 0 ? Math.round(((donationStats[camp.title]?.total || 0) / camp.goal) * 100) : 0}% • {donationStats[camp.title]?.count || 0} Donatur</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black">{(camp.beneficiaries_count || 0).toLocaleString('id-ID')}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            onClick={() => handleToggleActive(camp.id, camp.is_active)}
                            className={cn(
                              "text-[8px] font-black border-none cursor-pointer",
                              camp.is_active ? "bg-emerald-500" : "bg-gray-400"
                            )}
                          >
                            {camp.is_active ? "AKTIF" : "NONAKTIF"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="outline" size="sm" className="h-8 font-black text-[9px] gap-1.5 border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white" onClick={() => copyPromoMessage(camp)}>
                              <Copy className="w-3 h-3" /> PROMOSI
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#800000] hover:bg-[#800000]/10" onClick={() => populateForm(camp)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(camp.id, camp.title)}>
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
    </div>
  );
}
