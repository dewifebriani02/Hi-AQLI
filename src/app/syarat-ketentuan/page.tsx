'use client';

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShieldCheck, Lock, FileText, Scale, Info } from 'lucide-react';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-3xl mx-auto w-full px-4 py-8 md:py-12">
        <Link href="/register">
          <Button variant="ghost" className="mb-6 gap-2 text-slate-500 hover:text-[#800000] -ml-2">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Pendaftaran
          </Button>
        </Link>

        <Card className="border-none shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className="h-2 bg-gradient-to-r from-[#800000] via-[#D4AF37] to-[#800000]" />
          <CardHeader className="space-y-4 pt-10 pb-6 text-center">
            <div className="w-16 h-16 bg-[#800000]/5 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <FileText className="w-8 h-8 text-[#800000]" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black font-headline uppercase tracking-tight text-[#800000]">Syarat & Ketentuan</CardTitle>
              <CardDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Hi AQLI - Community & Tahfidz Companion</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 px-6 md:px-10 pb-12 prose prose-slate max-w-none">
            
            <section className="space-y-4">
              <div className="flex items-center gap-3 text-[#800000]">
                <Info className="w-5 h-5 fill-current opacity-20" />
                <h3 className="text-lg font-black uppercase tracking-tight m-0">1. Pendahuluan</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Selamat datang di Hi AQLI. Dengan mendaftar dan menggunakan layanan kami, Ukhti setuju untuk terikat oleh Syarat dan Ketentuan ini. Hi AQLI adalah platform pendamping tahfidz yang bertujuan untuk meningkatkan kualitas hafalan (Itqan) melalui metode Tikrar terstruktur dan dukungan komunitas.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 text-[#800000]">
                <ShieldCheck className="w-5 h-5 fill-current opacity-20" />
                <h3 className="text-lg font-black uppercase tracking-tight m-0">2. Komitmen Pengguna</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Sebagai pengguna Hi AQLI, Ukhti berkomitmen untuk:
              </p>
              <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
                <li>Menjaga integritas dalam melaporkan progres hafalan dan Mutaba'ah.</li>
                <li>Menghormati sesama pengguna dalam grup koordinasi atau komunitas.</li>
                <li>Tidak menyalahgunakan sistem AI atau konten eksklusif dalam aplikasi.</li>
                <li>Menjaga kerahasiaan akun dan kata sandi masing-masing.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 text-[#800000]">
                <Scale className="w-5 h-5 fill-current opacity-20" />
                <h3 className="text-lg font-black uppercase tracking-tight m-0">3. Program & Pembayaran</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Beberapa program di Hi AQLI bersifat berbayar (seperti Hi Mufradat) untuk mendukung keberlangsungan infrastruktur server dan pengembangan AI. Segala bentuk infaq dan biaya program dikelola dengan transparan untuk kebermanfaatan umat.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 text-[#800000]">
                <Lock className="w-5 h-5 fill-current opacity-20" />
                <h3 className="text-lg font-black uppercase tracking-tight m-0">4. Privasi Data</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Kami menjaga privasi data Ukhti dengan amanah. Nomor WhatsApp dan alamat email hanya akan digunakan untuk keperluan koordinasi program, verifikasi akun, dan pengumuman penting terkait Hi AQLI. Kami tidak akan menjual data Ukhti kepada pihak ketiga manapun.
              </p>
            </section>

            <div className="pt-8 border-t border-dashed">
              <p className="text-[10px] text-center text-slate-400 font-medium">
                Terakhir Diperbarui: 15 April 2026<br />
                HI AQLI - Berhijrah dengan Ilmu, Beramal dengan Itqan.
              </p>
            </div>

            <div className="flex justify-center pt-4">
              <Link href="/register" className="w-full">
                <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black h-12 rounded-xl shadow-lg uppercase tracking-widest text-[11px]">
                  Saya Mengerti & Kembali
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
