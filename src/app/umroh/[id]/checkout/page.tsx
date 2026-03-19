"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plane,
  Users,
  CreditCard,
  Check,
  ChevronRight,
  Hotel,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    nik: "",
    birthPlace: "",
    birthDate: "",
    phone: "",
    email: "",
    address: "",

    // Passport Info
    passportNumber: "",
    passportIssue: "",
    passportExpiry: "",
    passportName: "",

    // Emergency Contact
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",

    // Additional Travelers
    additionalTravelers: [] as Array<{
      name: string;
      nik: string;
      birthDate: string;
      passportNumber: string;
    }>,
  });

  const [selectedPayment, setSelectedPayment] = useState("");

  // Mock package data based on ID
  const packageData = {
    id: parseInt(params.id),
    name: "Paket Umrah Reguler 9 Hari",
    travel: "Al-Mabrur Travel",
    price: 28500000,
    duration: "9 Hari",
    departure: "15 Apr 2026",
    hotel: "Hotel Elaf Kinda *4",
    includes: ["Tiket Pesawat PP", "Hotel Bintang 4", "Makan 3x Sehari", "Visa Umrah", "Handling Airport"],
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Submit order
      alert("Pesanan berhasil! Silakan selesaikan pembayaran.");
      router.push("/umroh");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mt-4 px-1">
        <Link href="/umroh" className="flex items-center gap-2 text-[#800000] mb-2 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">Kembali ke Daftar Paket</span>
        </Link>
        <div className="flex items-center gap-2 text-[#800000] mb-2">
          <CreditCard className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#800000]">CHECKOUT</span>
        </div>
        <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight text-black">
          Pemesanan Paket Umrah
        </h1>
      </div>

      {/* Progress Steps */}
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: "Data Diri" },
              { num: 2, label: "Data Paspor" },
              { num: 3, label: "Pembayaran" },
            ].map((s) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step >= s.num
                        ? "bg-[#800000] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-medium ${
                      step >= s.num ? "text-[#800000]" : "text-gray-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {s.num < 3 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      step > s.num ? "bg-[#800000]" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Package Summary */}
      <Card className="border-l-4 border-[#D4AF37]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#800000] to-[#a32828]">
              <Plane className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-[#D4AF37] text-[#800000] text-[10px] font-black mb-1">
                    {packageData.travel}
                  </Badge>
                  <h3 className="font-bold text-sm">{packageData.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {packageData.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {packageData.departure}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#D4AF37] font-black text-lg">
                    Rp {(packageData.price / 1000000).toFixed(0)}jt
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#800000]">
                Data Pribadi Jamaah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap (Sesuai KTP)</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Ahmad Abdullah"
                  className="border-amber-200 focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK</Label>
                  <Input
                    id="nik"
                    name="nik"
                    value={formData.nik}
                    onChange={handleInputChange}
                    required
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. WhatsApp</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="08xxxxxxxxxx"
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthPlace">Tempat Lahir</Label>
                  <Input
                    id="birthPlace"
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleInputChange}
                    required
                    placeholder="Kota kelahiran"
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Tanggal Lahir</Label>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    required
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="email@contoh.com"
                  className="border-amber-200 focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                  className="border-amber-200 focus:border-[#D4AF37]"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#800000] hover:bg-[#a32828] text-white font-bold"
              >
                Lanjut
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Passport Info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#800000]">
                Data Paspor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Nomor Paspor</Label>
                <Input
                  id="passportNumber"
                  name="passportNumber"
                  value={formData.passportNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="Bxxxxxxxx"
                  className="border-amber-200 focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passportIssue">Tanggal Terbit</Label>
                  <Input
                    id="passportIssue"
                    name="passportIssue"
                    type="date"
                    value={formData.passportIssue}
                    onChange={handleInputChange}
                    required
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passportExpiry">Tanggal Berakhir</Label>
                  <Input
                    id="passportExpiry"
                    name="passportExpiry"
                    type="date"
                    value={formData.passportExpiry}
                    onChange={handleInputChange}
                    required
                    className="border-amber-200 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportName">Nama di Paspor</Label>
                <Input
                  id="passportName"
                  name="passportName"
                  value={formData.passportName}
                  onChange={handleInputChange}
                  required
                  placeholder="Sesuai dokumen paspor"
                  className="border-amber-200 focus:border-[#D4AF37]"
                />
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t">
                <h3 className="font-bold text-sm text-[#800000] mb-3">Kontak Darurat</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName">Nama Lengkap</Label>
                    <Input
                      id="emergencyName"
                      name="emergencyName"
                      value={formData.emergencyName}
                      onChange={handleInputChange}
                      required
                      placeholder="Nama kontak darurat"
                      className="border-amber-200 focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">No. Telepon</Label>
                      <Input
                        id="emergencyPhone"
                        name="emergencyPhone"
                        value={formData.emergencyPhone}
                        onChange={handleInputChange}
                        required
                        placeholder="08xxxxxxxxxx"
                        className="border-amber-200 focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelation">Hubungan</Label>
                      <Input
                        id="emergencyRelation"
                        name="emergencyRelation"
                        value={formData.emergencyRelation}
                        onChange={handleInputChange}
                        required
                        placeholder="Suami/Istri/Wali"
                        className="border-amber-200 focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-amber-200 text-amber-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Kembali
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#800000] hover:bg-[#a32828] text-white font-bold"
                >
                  Lanjut
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#800000]">
                Pilih Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Options */}
              <div className="space-y-3">
                {[
                  { id: "transfer", label: "Transfer Bank", desc: "BCA, Mandiri, BNI, BRI" },
                  { id: "va", label: "Virtual Account", desc: "Dari semua bank" },
                  { id: "ewallet", label: "E-Wallet", desc: "GoPay, OVO, Dana, ShopeePay" },
                  { id: "qris", label: "QRIS", desc: "Scan kode QR" },
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPayment === method.id
                        ? "border-[#D4AF37] bg-amber-50"
                        : "border-gray-200 hover:border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm">{method.label}</div>
                        <div className="text-xs text-muted-foreground">{method.desc}</div>
                      </div>
                      <Checkbox checked={selectedPayment === method.id} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga Paket</span>
                  <span>Rp {packageData.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biaya Admin</span>
                  <span>Rp 0</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total Pembayaran</span>
                  <span className="text-[#D4AF37]">Rp {packageData.price.toLocaleString()}</span>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox id="terms" required />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
                  Saya setuju dengan syarat dan ketentuan yang berlaku, serta memahami bahwa pembatalan
                  dikenakan biaya sesuai kebijakan travel.
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-amber-200 text-amber-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Kembali
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#D4AF37] to-amber-400 hover:from-amber-400 hover:to-amber-500 text-[#800000] font-bold"
                >
                  Bayar Sekarang
                  <CreditCard className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
