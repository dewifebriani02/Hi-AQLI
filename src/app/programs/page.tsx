'use client';

import { useState } from "react";
import { useUser } from "@/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, Library, CheckCircle2, ScrollText, Search, Users } from "lucide-react";
import { Logo } from "@/components/common/logo";

const PROGRAMS = [
  {
    id: "mufradat-premium",
    name: "Hi Mufradat",
    description: "Program hafalan 1 halaman/pekan dengan quiz interaktif, monitoring grup, dan musyrifah pendamping.",
    longDescription: "Target hafalan terukur dengan sistem juz dan evaluasi berkala. Cocok untuk pemula maupun yang sudah hafal.",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-600",
    price: "Rp 20.000/bulan",
    features: ["1 Halaman/Pekan", "Quiz Interaktif", "Monitoring Group", "Musyrifah Pendamping", "Sertifikat"],
    href: "/study-circles/registration?id=mufradat-premium",
    popular: true
  },
  {
    id: "tikrar-premium",
    name: "Hi Tikrar",
    description: "Metode muroja'ah 40x repetisi untuk itqan (menguatkan) hafalan Al-Qur'an.",
    longDescription: "Sistem repetisi terjadwal dengan target harian yang jelas. Dilengkapi tracking progress dan laporan kinerja.",
    icon: BookOpen,
    color: "from-blue-500 to-indigo-600",
    price: "Gratis",
    features: ["40x Repetisi/Hari", "Tracking Progress", "Laporan Kinerja", "Target Juz", "Komunitas Tikrar"],
    href: "/study-circles/registration?id=tikrar-premium",
    popular: false
  },
  {
    id: "hi-ngaji",
    name: "Hi Ngaji",
    description: "Kelas belajar membaca Al-Qur'an dengan metode tartil yang terstruktur.",
    longDescription: "Belajar dari dasar hingga mahir bersama muallimah berpengalaman. Tersedia kelas reguler dan intensif.",
    icon: Library,
    color: "from-purple-500 to-violet-600",
    price: "Sesuai Kelas",
    features: ["Metode Tartil", "Muallimah Berpengalaman", "Kelas Reguler & Intensif", "Sertifikat", "Evaluasi Berkala"],
    href: "/study-circles/registration?program=hi_ngaji",
    popular: false
  }
];

export default function ProgramsPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-100 pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo variant="default" showText={true} />
            </Link>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="rounded-full">
                      Profil Saya
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="rounded-full">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-[#800000] hover:bg-[#800000]/90 text-white rounded-full">
                      Daftar
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
          <Users className="w-3 h-3 mr-1" /> Ekosistem Pembelajaran Al-Qur'an
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6">
          Pilih Program <span className="text-[#800000]">Hi AQLI</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
          Bergabunglah dengan ribuan thalibah lainnya dalam perjalanan menghafal dan memahami Al-Qur'an.
          Pilih program yang sesuai dengan kebutuhan dan tujuan Ukhti.
        </p>
      </div>

      {/* Programs Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROGRAMS.map((program) => (
            <Card
              key={program.id}
              className="group relative overflow-hidden border-2 hover:border-slate-300 transition-all duration-300 hover:shadow-xl bg-white"
            >
              {program.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-amber-500 text-white border-none shadow-lg">
                    POPULER
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${program.color} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                  <program.icon className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-slate-900">
                  {program.name}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600">
                  {program.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {program.longDescription}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fitur Program:</p>
                  <ul className="space-y-2">
                    {program.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Biaya Program</p>
                    <p className="text-lg font-black text-[#800000]">{program.price}</p>
                  </div>
                  <Button
                    asChild
                    className={`bg-gradient-to-r ${program.color} text-white border-0 hover:opacity-90`}
                  >
                    <Link href={program.href} className="flex items-center gap-2">
                      Daftar Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Other Programs Preview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black mb-4">
              Program Lainnya Tersedia
            </h2>
            <p className="text-slate-300 mb-8">
              Hi AQLI juga menyediakan program pendukung untuk memaksimalkan perjalanan menghafal Al-Qur'an Ukhti.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <ScrollText className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-bold">Hi Tilawah</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <HeartHandshake className="w-8 h-8 mx-auto mb-2 text-rose-400" />
                <p className="text-sm font-bold">Hi Berbagi</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <Search className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="text-sm font-bold">Hi Mutaba'ah</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm font-bold">Hi Muhasabah</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Program-program ini tersedia gratis di dashboard setelah Ukhti terdaftar.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pb-16">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 sm:p-12">
          <h3 className="text-2xl font-black text-slate-900 mb-4">
            Bingung Memilih Program?
          </h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Konsultasikan dengan tim Hi AQLI untuk menentukan program yang paling sesuai dengan target dan kemampuan Ukhti.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" className="border-slate-300 hover:bg-slate-50">
              <Link href="https://wa.me/6281234567890" target="_blank">
                <Users className="w-4 h-4 mr-2" />
                Konsultasi via WhatsApp
              </Link>
            </Button>
            <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 text-white">
              <Link href="/">
                <ArrowRight className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
