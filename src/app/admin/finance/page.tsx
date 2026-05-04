"use client";

import { useState, useMemo } from "react";
import { useCollection } from "@/supabase/db";
import { supabase } from "@/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  ChevronRight,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
  Wallet,
  ShieldCheck,
  Building2,
  HeartHandshake,
  Code2,
  Trash2,
  Search,
  Gift,
  BookOpen,
  FileText,
  Plus,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addMonths, format, parseISO, startOfMonth, addDays } from "date-fns";

const FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

export default function MufradatFinancePage() {
  const { toast } = useToast();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [isCairkanLoading, setIsCairkanLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMonthData, setPreviewMonthData] = useState<any>(null);

  // Manual Transaction States
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [manualUser, setManualUser] = useState<string>("");
  const [manualHalaqah, setManualHalaqah] = useState<string>("");
  const [manualAmount, setManualAmount] = useState<string>("0");
  const [manualMonth, setManualMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [manualUniqueCode, setManualUniqueCode] = useState<string>("0");
  const [manualType, setManualType] = useState<string>("monthly"); // 'initial' or 'monthly'

  // Edit Transaction States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editingReg, setEditingReg] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editUniqueCode, setEditUniqueCode] = useState("");
  const [editRegFee, setEditRegFee] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editType, setEditType] = useState("monthly");

  const { data: usersData, isLoading: isUsersLoading } = useCollection("users");
  const { data: groups, isLoading: isGroupsLoading } = useCollection("mufradat_groups");
  const { data: halaqahs, isLoading: isHalaqahsLoading } = useCollection("halaqahs");

  // Fetch ALL halaqah registrations for mufradat
  // Note: We need confirmed/verified registrations only
  const {
    data: allRegistrations,
    isLoading: isRegLoading,
    refresh: refreshRegs,
  } = useCollection("halaqah_registrations", {
    filters: [{ column: "status", operator: "==", value: "verified" }],
  });

  const { data: payouts, refresh: refreshPayouts } = useCollection(
    "mufradat_payouts",
    {
      orderBy: { column: "billing_month", ascending: false },
    },
  );

  const mufradatRegistrations = useMemo(() => {
    if (!allRegistrations) return [];
    return allRegistrations.filter(
      (reg) =>
        reg.is_premium || 
        reg.registration_fee > 0 ||
        reg.halaqah_id?.startsWith("mufradat-") ||
        reg.metadata?.program === "mufradat" ||
        reg.halaqah_title?.toLowerCase().includes("mufradat"),
    );
  }, [allRegistrations]);

  // 2. DATA PROCESSING
  const financeData = useMemo(() => {
    if (!mufradatRegistrations || !groups) return {};

    // Grouping registrations by month and group
    const months: Record<string, any> = {};

    mufradatRegistrations.forEach((reg) => {
      // Fallback: If billing_month is missing, calculate it based on verification date or current date
      const monthKey =
        reg.billing_month ||
        (reg.verified_at
          ? reg.verified_at.substring(0, 7)
          : new Date().toISOString().substring(0, 7));

      if (!monthKey) return;

      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          totalRevenue: 0,
          totalUniqueCode: 0,
          totalRegGross: 0,
          totalRegDiscounts: 0,
          referralCommissions: {}, // referrer_id -> { name, amount }
          registrationPayers: [], // { name, amount, totalPaid }
          groups: {},
          isDisbursed: payouts?.some((p: any) => p.billing_month === monthKey),
        };
      }

      const amount = Number(reg.amount) || 0;
      const uniqueCode = Number(reg.unique_code) || (amount % 1000);
      const regFeeGross = Number(reg.registration_fee) || 0;
      const refDiscount = Number(reg.referral_discount_amount) || 0;

      // Tracking Totals
      months[monthKey].totalRevenue += amount;
      months[monthKey].totalUniqueCode += uniqueCode;
      months[monthKey].totalRegGross += regFeeGross;
      months[monthKey].totalRegDiscounts += refDiscount;

      if (regFeeGross > 0) {
        months[monthKey].registrationPayers.push({
          name: reg.username || reg.metadata?.name || "Thalibah",
          amount: regFeeGross,
          totalPaid: amount,
          isFirst: reg.is_first_registration
        });
      }

      // Handle Referral Commissions (Referrer gets 5k)
      if (reg.referral_code_used) {
        const referrer = usersData?.find(u => u.referral_code === reg.referral_code_used);
        if (referrer) {
          if (!months[monthKey].referralCommissions[referrer.id]) {
            months[monthKey].referralCommissions[referrer.id] = {
              name: referrer.username || "Referrer",
              amount: 0,
              bank: {
                name: referrer.bank_name,
                no: referrer.bank_account_number,
                holder: referrer.bank_account_holder
              }
            };
          }
          months[monthKey].referralCommissions[referrer.id].amount += 5000;
        }
      }

      const groupId = reg.metadata?.mufradat_group_id || "unassigned";
      if (!months[monthKey].groups[groupId]) {
        const groupInfo = groups.find((g) => g.id === groupId);
        months[monthKey].groups[groupId] = {
          name: groupInfo?.name || "Lainnya/Tanpa Grup",
          musyrifah: groupInfo?.musyrifah_name || "-",
          muallimah: groupInfo?.muallimah_name || "-",
          revenue: 0,
          uniqueCode: 0,
        };
      }

      months[monthKey].groups[groupId].revenue += amount;
      months[monthKey].groups[groupId].uniqueCode += uniqueCode;
      
      // Group-specific registration data (to exclude it from group revenue splits)
      if (!months[monthKey].groups[groupId].regNet) months[monthKey].groups[groupId].regNet = 0;
      months[monthKey].groups[groupId].regNet += (regFeeGross - refDiscount);
    });

    return months;
  }, [mufradatRegistrations, groups, payouts]);

  const sortedMonths = useMemo(() => {
    return Object.values(financeData).sort((a: any, b: any) =>
      b.month.localeCompare(a.month),
    );
  }, [financeData]);

  // 3. CALCULATION HELPERS
  const calculateSplits = (monthData: any) => {
    const totalRevenue = monthData.totalRevenue;
    const totalUniqueCode = monthData.totalUniqueCode;
    const totalRegNet = monthData.totalRegGross - monthData.totalRegDiscounts;
    
    // Infaq Bersih is after Unique Code and the portion of payment that belongs to Registration
    const baseInfaq = totalRevenue - totalUniqueCode - totalRegNet;

    // Splits
    const musyrifahTotal = baseInfaq * 0.4;
    const muallimahTotal = baseInfaq * 0.1;
    const devTotal = baseInfaq * 0.2;
    const hiBerbagiTotal = baseInfaq * 0.1 + totalUniqueCode;
    const operationsTotal = baseInfaq * 0.2;

    // Breakdown per group
    const groupsList = Object.entries(monthData.groups).map(
      ([id, g]: [string, any]) => {
        const gRegNet = g.regNet || 0;
        const gInfaq = g.revenue - g.uniqueCode - gRegNet;
        return {
          id,
          ...g,
          musyrifahFee: gInfaq * 0.4,
          muallimahFee: gInfaq * 0.1,
        };
      },
    );

    return {
      totalUniqueCode,
      totalRegGross: monthData.totalRegGross,
      totalRegDiscounts: monthData.totalRegDiscounts,
      totalRegNet,
      referralCommissions: monthData.referralCommissions,
      registrationPayers: monthData.registrationPayers,
      baseInfaq,
      musyrifahTotal: baseInfaq * 0.4,
      muallimahTotal: baseInfaq * 0.1,
      devTotal: baseInfaq * 0.2,
      hiBerbagiTotal: baseInfaq * 0.1 + totalUniqueCode,
      operationsTotal: baseInfaq * 0.2,
      groups: groupsList,
    };
  };

  const getMonthFallback = (reg: any) => {
    return (
      reg.billing_month ||
      (reg.verified_at
        ? reg.verified_at.substring(0, 7)
        : new Date().toISOString().substring(0, 7))
    );
  };

  const individualHistory = useMemo(() => {
    if (!payouts) return [];

    const history: any[] = [];
    payouts.forEach((p: any) => {
      const breakdown = p.payout_breakdown;
      if (!breakdown || !breakdown.groups) return;

      breakdown.groups.forEach((g: any) => {
        // Musyrifah
        if (g.musyrifah && g.musyrifah !== "-") {
          history.push({
            name: g.musyrifah,
            role: "MUSYRIFAH",
            month: p.billing_month,
            amount: g.musyrifahFee,
            group: g.name,
          });
        }
        // Muallimah
        if (g.muallimah && g.muallimah !== "-") {
          history.push({
            name: g.muallimah,
            role: "MUALLIMAH",
            month: p.billing_month,
            amount: g.muallimahFee,
            group: g.name,
          });
        }
      });
    });

    return history.sort((a, b) => b.month.localeCompare(a.month));
  }, [payouts]);
  
  // 4. ACTION HANDLERS
  const handleSubmitManualTransaction = async () => {
    if (!manualUser || !manualHalaqah) {
      toast({
        title: "Gagal",
        description: "Pilih Thalibah dan Program terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    setIsManualLoading(true);
    try {
      const selectedUser = usersData?.find((u: any) => u.id === manualUser);
      const selectedHalaqah = halaqahs?.find((h: any) => h.id === manualHalaqah);

      if (!selectedUser || !selectedHalaqah) throw new Error("Thalibah atau Program tidak valid.");

      const isMufradatReg = selectedHalaqah.id === 'mufradat-premium' || selectedHalaqah.title?.toLowerCase().includes('mufradat');
      const isTikrarReg = selectedHalaqah.id?.includes('tikrar') || selectedHalaqah.title?.toLowerCase().includes('tikrar');

      const totalAmount = parseInt(manualAmount) + parseInt(manualUniqueCode);

      // 1. Insert Verified Registration
      const regData = {
        user_id: selectedUser.id,
        user_name: selectedUser.username || selectedUser.full_name || "Thalibah",
        user_email: selectedUser.email,
        whatsapp: selectedUser.whatsapp || selectedUser.phone || "-",
        halaqah_id: selectedHalaqah.id,
        halaqah_title: selectedHalaqah.title,
        status: "verified",
        verified_at: new Date().toISOString(),
        start_date: new Date().toISOString(),
        amount: totalAmount,
        unique_code: parseInt(manualUniqueCode),
        billing_month: manualMonth,
        payment_method: "manual_transfer",
        is_paid: true,
        payment_type: manualType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        referral_code_used: selectedUser.referral_code_used || null, // Fallback to provided if any
      };

      const { data: newReg, error: regError } = await supabase
        .from("halaqah_registrations")
        .insert(regData)
        .select()
        .single();

      if (regError) throw regError;

      // 2. User Profile Activation
      const currentFollowed = selectedUser.followed_halaqahs || [];
      const updateData: any = {
        followed_halaqahs: currentFollowed.includes(selectedHalaqah.id) ? currentFollowed : [...currentFollowed, selectedHalaqah.id],
        updated_at: new Date().toISOString()
      };

      // Auto-Grouping Logic for Mufradat
      if (!selectedUser.mufradat_group_id && isMufradatReg) {
        const { data: availableGroups } = await supabase
          .from('mufradat_groups')
          .select('*')
          .lt('member_count', 50)
          .order('created_at', { ascending: false })
          .limit(1);

        if (availableGroups && availableGroups.length > 0) {
          updateData.mufradat_group_id = availableGroups[0].id;
          await supabase.from('mufradat_groups').update({ member_count: availableGroups[0].member_count + 1 }).eq('id', availableGroups[0].id);
        } else {
          const { data: allGroups } = await supabase.from('mufradat_groups').select('id');
          const nextNum = (allGroups?.length || 0) + 1;
          const { data: newGroup } = await supabase.from('mufradat_groups').insert({ name: `Grup ${nextNum}`, member_count: 1 }).select().single();
          if (newGroup) updateData.mufradat_group_id = newGroup.id;
        }
      }

      // Tikrar Specific
      if (isTikrarReg) {
        updateData.is_tikrar_paid = true;
        updateData.tikrar_start_date = new Date().toISOString();
      }

      // Subscription logic for Hi Mufradat
      if (isMufradatReg) {
        updateData.mufradat_status = 'active';
        if (manualType === 'monthly') {
          const monthDate = parseISO(`${manualMonth}-01`);
          updateData.mufradat_due_date = addDays(addMonths(monthDate, 1), 9).toISOString();
        } else {
          updateData.mufradat_due_date = addDays(addMonths(startOfMonth(new Date()), 1), 9).toISOString();
        }
      }

      const { error: userError } = await supabase.from("users").update(updateData).eq('id', selectedUser.id);
      if (userError) throw userError;

      // 3. Referral Bonus Logic
      const referralCodeUsed = regData.referral_code_used || selectedUser.referred_by_id;
      if (referralCodeUsed) {
        // Check if any OTHER verified registrations exist
        const { count } = await supabase
          .from("halaqah_registrations")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", selectedUser.id)
          .eq("status", "verified")
          .neq("id", newReg.id);

        if (count === 0) {
          let referrer = null;
          if (regData.referral_code_used) {
            const { data } = await supabase.from("users").select("id, referral_balance, username").eq("referral_code", regData.referral_code_used).maybeSingle();
            referrer = data;
          } else if (selectedUser.referred_by_id) {
            const { data } = await supabase.from("users").select("id, referral_balance, username").eq("id", selectedUser.referred_by_id).maybeSingle();
            referrer = data;
          }

          if (referrer) {
            await supabase.from("users").update({ referral_balance: (referrer.referral_balance || 0) + 5000 }).eq("id", referrer.id);
            console.log(`Manual Reward: 5000 to ${referrer.username}`);
          }
        }
      }

      toast({
        title: "Transaksi Berhasil",
        description: `Manual transaction ${selectedUser.username} telah dicatat dan akun diaktifkan.`,
      });
      setIsManualOpen(false);
      refreshRegs();
    } catch (err: any) {
      toast({
        title: "Gagal",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleCairkan = async (monthData: any) => {
    const splits = calculateSplits(monthData);

    setIsCairkanLoading(true);
    try {
      const { error } = await supabase.from("mufradat_payouts").insert({
        billing_month: monthData.month,
        total_revenue: splits.totalRevenue,
        total_unique_code: splits.totalUniqueCode,
        payout_breakdown: splits,
        status: "sudah_cair",
        disbursed_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast({
        title: "Berhasil!",
        description: `Pencairan dana bulan ${monthData.month} telah dicatat.`,
      });
      refreshPayouts();
    } catch (err: any) {
      toast({
        title: "Gagal Mencairkan",
        description: err.message || "Terjadi kesalahan saat mencatat pencairan.",
        variant: "destructive",
      });
    } finally {
      setIsCairkanLoading(false);
      setIsPreviewOpen(false);
      setPreviewMonthData(null);
    }
  };

  const handleOpenPreview = (monthData: any) => {
    setPreviewMonthData(monthData);
    setIsPreviewOpen(true);
  };

  const handleDeletePayout = async (month: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin membatalkan pencairan bulan ${month}? Status akan kembali menjadi 'Menunggu Cair'.`,
      )
    )
      return;

    setIsCairkanLoading(true);
    try {
      const { error } = await supabase
        .from("mufradat_payouts")
        .delete()
        .eq("billing_month", month);

      if (error) throw error;
      toast({
        title: "Pencairan Dibatalkan",
        description: `Status bulan ${month} kembali menjadi Menunggu Cair.`,
      });
      refreshPayouts();
    } catch (err: any) {
      toast({
        title: "Gagal Membatalkan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCairkanLoading(false);
    }
  };

  const handleDeleteRegistration = async (regId: string, userName: string) => {
    if (
      !confirm(
        `Hapus transaksi atas nama ${userName}? Perubahan ini akan langsung memengaruhi total omset.`,
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("halaqah_registrations")
        .delete()
        .eq("id", regId);
      if (error) throw error;
      toast({ title: "Transaksi Dihapus" });
      refreshRegs();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: e.message,
      });
    }
  };

  const openEditDialog = (reg: any) => {
    setEditingReg(reg);
    setEditName(reg.user_name || "");
    setEditAmount((Number(reg.amount) - (Number(reg.unique_code) || (Number(reg.amount) % 1000))).toString());
    setEditUniqueCode((Number(reg.unique_code) || (Number(reg.amount) % 1000)).toString());
    setEditRegFee((Number(reg.registration_fee) || 0).toString());
    setEditMonth(getMonthFallback(reg));
    setEditType(reg.payment_type || "monthly");
    setIsEditOpen(true);
  };

  const handleEditRegistration = async () => {
    if (!editingReg) return;

    setIsEditLoading(true);
    try {
      const totalAmount = parseInt(editAmount) + parseInt(editUniqueCode);
      
      const { error } = await supabase
        .from("halaqah_registrations")
        .update({
          user_name: editName,
          amount: totalAmount,
          unique_code: parseInt(editUniqueCode),
          registration_fee: parseInt(editRegFee),
          billing_month: editMonth,
          payment_type: editType,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingReg.id);

      if (error) throw error;

      toast({
        title: "Perubahan Disimpan",
        description: `Data transaksi ${editName} berhasil diperbarui.`,
      });
      setIsEditOpen(false);
      refreshRegs();
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!mufradatRegistrations) return [];
    return mufradatRegistrations
      .filter(
        (r) =>
          r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.halaqah_title?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
  }, [mufradatRegistrations, searchTerm]);

  if (isGroupsLoading || isRegLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Menghitung Data Keuangan...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8 pb-32">
      {/* HEADER */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-[#800000] transition-colors">
          Admin
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link
          href="/admin/mufradat"
          className="hover:text-[#800000] transition-colors"
        >
          Hi Mufradat
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#800000]">Laporan Keuangan</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tighter text-[#800000] uppercase italic">
            MONITOR KEUANGAN
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Pendapatan &
            Distribusi Fee Otomatis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-lg gap-2">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">TRANSAKSI MANUAL</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 bg-[#800000] text-white">
                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Plus className="w-5 h-5" /> Input Transaksi Manual
                </DialogTitle>
                <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-1">
                  Mencatat pembayaran manual & aktivasi akses thalibah
                </DialogDescription>
              </DialogHeader>

              <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Pilih Thalibah
                  </Label>
                  <Select value={manualUser} onValueChange={setManualUser}>
                    <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                      <SelectValue placeholder="-- Pilih Thalibah --" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersData?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.username || u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Program & Paket
                  </Label>
                  <Select value={manualHalaqah} onValueChange={setManualHalaqah}>
                    <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                      <SelectValue placeholder="-- Pilih Program --" />
                    </SelectTrigger>
                    <SelectContent>
                      {halaqahs?.map((h: any) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Nominal Transfer
                    </Label>
                    <Input
                      type="number"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Kode Unik
                    </Label>
                    <Input
                      type="number"
                      value={manualUniqueCode}
                      onChange={(e) => setManualUniqueCode(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Bulan Laporan
                    </Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM"
                      value={manualMonth}
                      onChange={(e) => setManualMonth(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Tipe Transaksi
                    </Label>
                    <Select value={manualType} onValueChange={setManualType}>
                      <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial">Pendaftaran Awal</SelectItem>
                        <SelectItem value="monthly">Iuran Bulanan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-emerald-800 font-bold leading-relaxed italic">
                    Penginputan ini akan langsung memverifikasi akses thalibah
                    dan muncul di laporan keuangan bulan terpilih.
                  </p>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 font-bold h-12"
                  onClick={() => setIsManualOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  className="flex-[2] bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-lg"
                  onClick={handleSubmitManualTransaction}
                  disabled={isManualLoading}
                >
                  {isManualLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "CATAT & AKTIFKAN AKSES"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* EDIT TRANSACTION DIALOG */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-8 bg-blue-600 text-white">
                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Pencil className="w-5 h-5" /> Koreksi Data Transaksi
                </DialogTitle>
                <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-1">
                  Memperbarui data pendaftaran & rincian finansial thalibah
                </DialogDescription>
              </DialogHeader>

              <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                {editMonth && financeData[editMonth]?.isDisbursed && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3 animate-pulse">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <p className="text-[10px] text-rose-800 font-black leading-relaxed italic">
                      PERINGATAN: Bulan ini sudah dicairkan. Mengubah data ini akan menyebabkan ketidaksinkronan dengan laporan payout yang sudah ada.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Nama Thalibah (Internal)
                  </Label>
                  <Input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-12 border-2 rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Nominal Infaq (Base)
                    </Label>
                    <Input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black text-[#800000]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Kode Unik
                    </Label>
                    <Input
                      type="number"
                      value={editUniqueCode}
                      onChange={(e) => setEditUniqueCode(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Biaya Pendaftaran (Gross)
                    </Label>
                    <Input
                      type="number"
                      value={editRegFee}
                      onChange={(e) => setEditRegFee(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black text-blue-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Bulan Laporan
                    </Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM"
                      value={editMonth}
                      onChange={(e) => setEditMonth(e.target.value)}
                      className="h-12 border-2 rounded-xl font-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Tipe Transaksi
                  </Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial">Pendaftaran Awal</SelectItem>
                      <SelectItem value="monthly">Iuran Bulanan</SelectItem>
                      <SelectItem value="leave_request">Cuti (0 Nom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-[10px] text-blue-800 font-bold leading-relaxed italic">
                    Koreksi data ini hanya memengaruhi rekaman finansial. Hak akses thalibah menyesuaikan dengan status terbaru di profil user.
                  </p>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 font-bold h-12"
                  onClick={() => setIsEditOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl shadow-lg"
                  onClick={handleEditRegistration}
                  disabled={isEditLoading}
                >
                  {isEditLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "SIMPAN PERUBAHAN"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">
                Total Omset Terverifikasi
              </p>
              <p className="text-2xl font-black text-emerald-900 tracking-tighter">
                {FORMATTER.format(
                  mufradatRegistrations.reduce(
                    (acc, r) => acc + (Number(r.amount) || 0),
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-xl bg-white overflow-hidden group">
          <div className="h-1 bg-amber-500 w-full" />
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Struktur Fee
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Musyrifah</span>
                <span className="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md">
                  40%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Muallimah</span>
                <span className="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md">
                  10%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Developer</span>
                <span className="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md">
                  20%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Hi Berbagi</span>
                <span className="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md">
                  10% + Kode
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">
                  Operasional AQLI
                </span>
                <span className="font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded-md">
                  20%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-[#800000] text-white overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">
                Hi Berbagi Balance
              </p>
              <p className="text-3xl font-black tracking-tighter">
                {FORMATTER.format(
                  mufradatRegistrations.reduce((acc, r) => {
                    const amt = Number(r.amount) || 0;
                    const code = Number(r.unique_code) || (amt % 1000);
                    return acc + (amt - code) * 0.1 + code;
                  }, 0),
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Dana Abadi Donasi
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-slate-800 text-white overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">
                Ops AQLI Balance (20%)
              </p>
              <p className="text-3xl font-black tracking-tighter">
                {FORMATTER.format(
                  mufradatRegistrations.reduce((acc, r) => {
                    const amt = Number(r.amount) || 0;
                    const code = Number(r.unique_code) || (amt % 1000);
                    const netReg = (Number(r.registration_fee) || 0) - (Number(r.referral_discount_amount) || 0);
                    return acc + (amt - code - netReg) * 0.2;
                  }, 0),
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Operasional Yayasan
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-blue-900 text-white overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">
                Saldo Pendaftaran
              </p>
              <p className="text-3xl font-black tracking-tighter">
                {FORMATTER.format(
                  mufradatRegistrations.reduce((acc, r) => {
                    return acc + (Number(r.registration_fee) || 0) - (Number(r.referral_discount_amount) || 0);
                  }, 0),
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Kas Pendaftaran
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {sortedMonths.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center bg-slate-50/50">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">
            Belum Ada Data Pendaftaran Bulanan
          </h3>
          <p className="text-xs text-muted-foreground italic mt-1 font-bold lowercase">
            hanya pendaftaran dengan status 'verified' yang akan masuk ke sini
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedMonths.map((monthData: any) => {
            const isExpanded = expandedMonth === monthData.month;
            const splits = calculateSplits(monthData);
            const displayMonth = new Date(
              monthData.month + "-01",
            ).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

            return (
              <Card
                key={monthData.month}
                className={cn(
                  "border-2 transition-all overflow-hidden",
                  monthData.isDisbursed
                    ? "border-emerald-100 bg-emerald-50/20"
                    : "border-slate-100 bg-white",
                )}
              >
                {/* MONTH HEADER */}
                <div
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                  onClick={() =>
                    setExpandedMonth(isExpanded ? null : monthData.month)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-3 rounded-xl flex items-center justify-center shadow-md",
                        monthData.isDisbursed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-white",
                      )}
                    >
                      {monthData.isDisbursed ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Clock className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-headline tracking-tighter text-slate-800 uppercase">
                        {displayMonth}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">
                          Status:
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
                            monthData.isDisbursed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {monthData.isDisbursed
                            ? "Sudah Cair"
                            : "Menunggu Cair"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pr-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">
                        Pendapatan Kotor
                      </p>
                      <p className="text-lg font-black text-slate-800 tracking-tighter">
                        {FORMATTER.format(monthData.totalRevenue)}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block" />
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">
                        Net Pendaftaran
                      </p>
                      <p className="text-lg font-black text-blue-800 tracking-tighter">
                        {FORMATTER.format(splits.totalRegNet)}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block" />
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                  <div className="border-t-2 border-dashed border-slate-100 p-6 bg-white space-y-6">
                    {/* STATS BREAKDOWN */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl border-b-4 border-slate-300">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          Infaq Bulanan Bersih
                        </p>
                        <p className="text-sm font-black text-[#800000]">
                          {FORMATTER.format(splits.baseInfaq)}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border-b-4 border-slate-300">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">
                          Total Kode Unik
                        </p>
                        <p className="text-sm font-black text-[#D4AF37]">
                          {FORMATTER.format(splits.totalUniqueCode)}
                        </p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-xl border-b-4 border-rose-300">
                        <p className="text-[9px] font-bold text-rose-800 uppercase mb-1">
                          Fee Musyrifah (40%)
                        </p>
                        <p className="text-sm font-black text-rose-900">
                          {FORMATTER.format(splits.musyrifahTotal)}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl border-b-4 border-amber-300">
                        <p className="text-[9px] font-bold text-amber-800 uppercase mb-1">
                          Fee Muallimah (10%)
                        </p>
                        <p className="text-sm font-black text-amber-900">
                          {FORMATTER.format(splits.muallimahTotal)}
                        </p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border-b-4 border-emerald-300">
                        <p className="text-[9px] font-bold text-emerald-800 uppercase mb-1">
                          Hi Berbagi (10%+Kode)
                        </p>
                        <p className="text-sm font-black text-emerald-900">
                          {FORMATTER.format(splits.hiBerbagiTotal)}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border-b-4 border-blue-300">
                        <p className="text-[9px] font-bold text-blue-800 uppercase mb-1">
                          Net Pendaftaran
                        </p>
                        <p className="text-sm font-black text-blue-900">
                          {FORMATTER.format(splits.totalRegNet)}
                        </p>
                      </div>
                    </div>

                    {/* RECIPIENT TABLE */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#800000] flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Rincian Distribusi Fee
                        per Group
                      </h4>
                      <div className="border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-[10px] font-black uppercase py-3">
                                Nama Group
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase">
                                Musyrifah (40%)
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase">
                                Muallimah (10%)
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase text-right">
                                Revenue Group
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {splits.groups.map((g) => (
                              <TableRow key={g.id}>
                                <TableCell>
                                  <p className="text-xs font-black text-slate-800">
                                    {g.name}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">
                                      {g.musyrifah}
                                    </span>
                                    <span className="text-[10px] text-rose-600 font-black">
                                      {FORMATTER.format(g.musyrifahFee)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">
                                      {g.muallimah}
                                    </span>
                                    <span className="text-[10px] text-amber-600 font-black">
                                      {FORMATTER.format(g.muallimahFee)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-xs font-bold text-slate-400">
                                    {FORMATTER.format(g.revenue)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* REGISTRATION & REFERRAL REPORT SECTION */}
                    <div className="p-4 rounded-3xl bg-slate-50/50 border-2 border-dashed border-slate-200">
                       <div className="flex items-center gap-2 mb-4 px-2">
                          <Gift className="w-5 h-5 text-blue-600" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Laporan Pendaftaran & Referral</h4>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-2xl bg-white border shadow-sm">
                             <p className="text-[9px] font-black uppercase text-slate-400 mb-1 leading-none">Pendaftaran (Gross)</p>
                             <p className="text-lg font-black text-slate-800 leading-none">{FORMATTER.format(splits.totalRegGross)}</p>
                             <p className="text-[8px] font-bold text-slate-400 mt-2 italic leading-none">Dihitung Rp 10rb per thalibah baru</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white border shadow-sm border-amber-100">
                             <p className="text-[9px] font-black uppercase text-amber-600 mb-1 leading-none">Potongan & Komisi Ref</p>
                             <div className="flex items-baseline justify-between mb-1">
                                <p className="text-lg font-black text-amber-700 leading-none">{FORMATTER.format(splits.totalRegDiscounts + (Object.values(splits.referralCommissions).reduce((a,c:any)=>a+c.amount,0)))}</p>
                                <Badge className="bg-amber-100 text-amber-700 text-[8px] font-black border-none h-4">5rb/Ref</Badge>
                             </div>
                             <p className="text-[8px] font-bold text-slate-400 italic leading-none">Total Keringanan User + Komisi Referrer</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                             <p className="text-[9px] font-black uppercase text-blue-100 mb-1 leading-none">Net Pendaftaran</p>
                             <p className="text-lg font-black leading-none">{FORMATTER.format(splits.totalRegNet)}</p>
                             <p className="text-[8px] font-bold text-blue-200 mt-2 italic leading-none">Kas operasional pendaftaran</p>
                          </div>
                       </div>

                       {Object.keys(splits.referralCommissions).length > 0 && (
                          <div className="mt-4">
                             <div className="flex items-center gap-2 mb-2 px-2">
                                <Users className="w-3.5 h-3.5 text-emerald-600" />
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Daftar Komisi Referral</h5>
                             </div>
                             <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                                <Table>
                                   <TableHeader className="bg-slate-50">
                                      <TableRow>
                                         <TableHead className="text-[9px] font-black uppercase py-2">Referrer</TableHead>
                                         <TableHead className="text-[9px] font-black uppercase">Rekening</TableHead>
                                         <TableHead className="text-right pr-6 text-[9px] font-black uppercase">Komisi</TableHead>
                                      </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                      {Object.entries(splits.referralCommissions).map(([id, data]: [string, any]) => (
                                         <TableRow key={id} className="hover:bg-slate-50/50">
                                            <TableCell className="py-2.5">
                                               <span className="text-[11px] font-black text-slate-800">{data.name}</span>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                               {data.bank?.no ? (
                                                  <span className="text-[10px] font-black text-slate-500">{data.bank.name} {data.bank.no}</span>
                                               ) : (
                                                  <span className="text-[9px] text-rose-500 font-bold">BELUM ISI REKENING</span>
                                               )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-2.5">
                                               <span className="text-xs font-black text-emerald-700">{FORMATTER.format(data.amount)}</span>
                                            </TableCell>
                                         </TableRow>
                                      ))}
                                   </TableBody>
                                </Table>
                             </div>
                          </div>
                       )}

                       {splits.registrationPayers.length > 0 && (
                          <div className="mt-6 border-t pt-4">
                             <div className="flex items-center gap-2 mb-2 px-2">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Daftar Pembayar Pendaftaran (Audit)</h5>
                             </div>
                             <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                                <Table>
                                   <TableHeader className="bg-slate-50">
                                      <TableRow>
                                         <TableHead className="text-[9px] font-black uppercase py-2">Nama Thalibah</TableHead>
                                         <TableHead className="text-[9px] font-black uppercase">Total Bayar</TableHead>
                                         <TableHead className="text-right pr-6 text-[9px] font-black uppercase">Fee Pendaftaran</TableHead>
                                      </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                      {splits.registrationPayers.map((p: any, idx: number) => (
                                         <TableRow key={idx} className="hover:bg-slate-50/50">
                                            <TableCell className="py-2.5">
                                               <div className="flex items-center gap-2">
                                                  <span className="text-[11px] font-black text-slate-800">{p.name}</span>
                                                  {p.isFirst && <Badge className="text-[7px] h-3 bg-blue-100 text-blue-700 border-none font-black uppercase">First Time</Badge>}
                                               </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                               <span className="text-[10px] font-bold text-slate-400">{FORMATTER.format(p.totalPaid)}</span>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-2.5">
                                               <span className="text-xs font-black text-blue-600">{FORMATTER.format(p.amount)}</span>
                                            </TableCell>
                                         </TableRow>
                                      ))}
                                   </TableBody>
                                </Table>
                             </div>
                             <p className="text-[8px] font-bold text-slate-400 mt-2 italic px-2">
                                *Jika ada thalibah yang terhitung pendaftaran padahal tidak bayar, silakan edit pendaftaran thalibah tersebut di menu Pendaftaran.
                             </p>
                          </div>
                       )}
                    </div>

                    {/* AQLI & DEV SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Ops AQLI (20%)
                            </p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">
                              {FORMATTER.format(splits.operationsTotal)}
                            </p>
                          </div>
                        </div>
                        <ShieldCheck className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Code2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              Developer (20%)
                            </p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">
                              {FORMATTER.format(splits.devTotal)}
                            </p>
                          </div>
                        </div>
                        <ShieldCheck className="w-5 h-5 text-slate-300" />
                      </div>
                    </div>

                    {/* CAIRKAN ACTION */}
                    <div className="pt-4 flex items-center justify-center gap-4 border-t-2 border-dashed border-slate-100">
                      {monthData.isDisbursed ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-emerald-700 bg-emerald-50 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5" /> Dana Sudah
                            Dicairkan & Terkunci
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-[10px] uppercase tracking-wider"
                            onClick={() => handleDeletePayout(monthData.month)}
                            disabled={isCairkanLoading}
                          >
                            Batal Cairkan (Edit Data)
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black uppercase text-xs h-14 px-10 rounded-2xl shadow-xl shadow-[#800000]/20 gap-3 active:scale-95 transition-all"
                          onClick={() => handleOpenPreview(monthData)}
                          disabled={isCairkanLoading}
                        >
                          {isCairkanLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Wallet className="w-5 h-5" />
                          )}
                          Review & Cairkan Bulanan
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* TRANSACTION HISTORY SECTION */}
      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden mt-8">
        <CardHeader className="p-6 pb-2 border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                Daftar Seluruh Transaksi
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-[#800000]">
                Histori Pendapatan Mufradat
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama atau kelas..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">
                    Peserta
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase">
                    Program/Kelas
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">
                    Bulan
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase">
                    Metode
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase">
                    Amount
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground italic text-xs"
                    >
                      Data tidak ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((reg) => (
                    <TableRow
                      key={reg.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                            {reg.user_name?.[0] || "U"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800">
                              {reg.user_name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-bold tracking-tight">
                              {reg.whatsapp || reg.user_email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px] inline-block">
                          {reg.halaqah_title}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black border-slate-200 bg-white"
                        >
                          {getMonthFallback(reg)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[9px] font-black border-none px-2 py-0.5 shadow-sm",
                            reg.payment_method === "voucher"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {reg.payment_method === "voucher"
                            ? "VOUCHER"
                            : "TRANSFER BANK"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-black",
                            (Number(reg.amount) || 0) === 0 ? "text-rose-500 animate-pulse" : "text-[#800000]"
                          )}>
                            {FORMATTER.format(Number(reg.amount) || 0)}
                          </span>
                          {(Number(reg.amount) || 0) === 0 && (
                            <span className="text-[7px] font-black text-rose-600 uppercase">Perlu Koreksi</span>
                          )}
                          {(Number(reg.unique_code) > 0 || (Number(reg.amount) % 1000) > 0) && (
                            <span className="text-[9px] font-bold text-slate-400">
                              Kode: {Number(reg.unique_code) || (Number(reg.amount) % 1000)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            onClick={() => openEditDialog(reg)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            onClick={() =>
                              handleDeleteRegistration(reg.id, reg.user_name)
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* INDIVIDUAL PAYOUT HISTORY SECTION */}
      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden mt-8">
        <CardHeader className="p-6 pb-2 border-b bg-emerald-50/30">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                Riwayat Fee Per Individu
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                Detail Rekapitulasi Pembayaran Musyrifah & Muallimah
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">
                    Nama Penerima
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase">
                    Role
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">
                    Bulan
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase">
                    Halaqah
                  </TableHead>
                  <TableHead className="text-right pr-6 text-[10px] font-black uppercase">
                    Jumlah Fee
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {individualHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground italic text-xs"
                    >
                      Belum ada riwayat pencairan individu.
                    </TableCell>
                  </TableRow>
                ) : (
                  individualHistory.map((item, idx) => (
                    <TableRow
                      key={`${item.name}-${item.month}-${idx}`}
                      className="hover:bg-emerald-50/20 transition-colors"
                    >
                      <TableCell className="py-4 pl-6">
                        <span className="text-xs font-black text-slate-800">
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[9px] font-black border-none px-2 py-0.5",
                            item.role === "MUSYRIFAH"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {item.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-bold text-slate-500">
                          {item.month}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-medium text-slate-400 italic">
                          {item.group}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="text-xs font-black text-emerald-700">
                          {FORMATTER.format(item.amount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FOOTER TIPS */}
      <div className="bg-[#800000]/5 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20 max-w-2xl mx-auto">
        <h4 className="flex items-center gap-2 font-black text-[#800000] mb-2 uppercase tracking-tight text-sm">
          Informasi Pencairan:
        </h4>
        <ul className="text-[11px] space-y-2 text-muted-foreground font-medium leading-relaxed list-disc pl-4 italic">
          <li>
            Data di atas dihitung secara **akumulasi** untuk seluruh Halaqah
            yang aktif di bulan tersebut.
          </li>
          <li>
            Tombol **"Cairkan"** akan mengunci laporan bulan tersebut agar data
            rincian fee tidak berubah di masa depan.
          </li>
          <li>
            Pastikan seluruh pendaftaran pembayaran thalibah sudah
            di-**verifikasi** oleh Admin sebelum mencairkan dana.
          </li>
        </ul>
      </div>

      {/* PAYOUT PREVIEW MODAL */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-[#800000] text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-amber-400" /> Review Pencairan Dana
            </DialogTitle>
            <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-1">
              Bulan: {previewMonthData?.month} • Pastikan Nominal & Rekening Sesuai
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
            <div className="grid gap-6">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-800">Daftar Penerima Fee</h3>
                <p className="text-xs text-slate-500 font-medium">Data di bawah ini mencakup Musyrifah dan Muallimah aktif.</p>
              </div>

              <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase py-4">Penerima</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Role</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Rekening (Bank/No/Nama)</TableHead>
                      <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Jumlah Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewMonthData && calculateSplits(previewMonthData).groups.map((g: any, idx: number) => {
                      const mUsers = [
                        { name: g.musyrifah, role: 'MUSYRIFAH', fee: g.musyrifahFee },
                        { name: g.muallimah, role: 'MUALLIMAH', fee: g.muallimahFee }
                      ];

                      return mUsers.filter(u => u.name && u.name !== '-').map((u, uIdx) => {
                        const userProfile = usersData?.find(p => p.username === u.name);
                        const hasBank = userProfile?.bank_account_number;

                        return (
                          <TableRow key={`${idx}-${uIdx}`} className="hover:bg-slate-50/50">
                            <TableCell className="py-4">
                              <span className="text-xs font-black text-slate-800">{u.name}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "text-[9px] font-black border-none px-2 py-0.5",
                                u.role === 'MUSYRIFAH' ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                              )}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {hasBank ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] font-black text-slate-700">{userProfile.bank_name}</span>
                                  <span className="text-[10px] font-bold text-[#800000]">{userProfile.bank_account_number}</span>
                                  <span className="text-[9px] font-medium text-slate-400 italic">a.n. {userProfile.bank_account_holder}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-rose-600 flex items-center gap-1 uppercase">
                                  <AlertCircle className="w-3 h-3" /> Rekening Belum Diisi
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className="text-xs font-black text-emerald-700">{FORMATTER.format(u.fee)}</span>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })}

                    {/* REFERRAL COMMISSIONS IN PREVIEW */}
                    {previewMonthData && Object.entries(calculateSplits(previewMonthData).referralCommissions).map(([id, data]: [string, any]) => (
                      <TableRow key={id} className="hover:bg-amber-50/50 bg-amber-50/20">
                        <TableCell className="py-4">
                          <span className="text-xs font-black text-slate-800">{data.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="text-[9px] font-black border-none px-2 py-0.5 bg-amber-100 text-amber-700">
                            REFERRER
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {data.bank?.no ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] font-black text-slate-700">{data.bank.name}</span>
                              <span className="text-[10px] font-bold text-[#800000]">{data.bank.no}</span>
                              <span className="text-[9px] font-medium text-slate-400 italic">a.n. {data.bank.holder}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-rose-600 flex items-center gap-1 uppercase">
                              <AlertCircle className="w-3 h-3" /> Rekening Kosong
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="text-xs font-black text-emerald-700">{FORMATTER.format(data.amount)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-slate-800 text-white flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase text-amber-400">Total Dev & Ops</span>
                    <span className="text-lg font-black tracking-tight mt-2">
                       {FORMATTER.format(
                         previewMonthData ? (calculateSplits(previewMonthData).devTotal + calculateSplits(previewMonthData).operationsTotal) : 0
                       )}
                    </span>
                 </div>
                 <div className="p-4 rounded-2xl bg-emerald-600 text-white flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase text-emerald-100">Total Hi Berbagi</span>
                    <span className="text-lg font-black tracking-tight mt-2">
                       {FORMATTER.format(
                         previewMonthData ? calculateSplits(previewMonthData).hiBerbagiTotal : 0
                       )}
                    </span>
                 </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t flex gap-3 sm:gap-4 sm:flex-row flex-col">
            <Button variant="ghost" className="flex-1 font-bold h-12 rounded-xl text-slate-500" onClick={() => setIsPreviewOpen(false)}>
              Batal
            </Button>
            <Button 
               className="flex-[2] bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-xl shadow-[#800000]/20 gap-3"
               onClick={() => handleCairkan(previewMonthData)}
               disabled={isCairkanLoading}
            >
               {isCairkanLoading ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
               ) : (
                 <CheckCircle2 className="w-5 h-5" />
               )}
               KONFIRMASI & KUNCI LAPORAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
