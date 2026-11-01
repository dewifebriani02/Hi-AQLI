'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  BookOpen,
  Calendar,
  Clock,
  Users,
  Award,
  CheckCircle2,
  Timer,
  ArrowRight,
  Sparkles,
  User as UserIcon,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser, useDoc, useCollection } from '@/db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StaticCircleInfo {
  id: string;
  title: string;
  program_type: string;
  instructor: string;
  musyrifah?: string;
  description: string;
  schedule: string;
  level: string;
  duration_weeks: number;
  is_premium: boolean;
  has_exam: boolean;
  has_certificate: boolean;
  workspaceHref: string;
  highlights: string[];
}

const STATIC_CIRCLES: Record<string, StaticCircleInfo> = {
  'tikrar-j30-b1': {
    id: 'tikrar-j30-b1',
    title: 'Hi Tikrar (Tikrar Daily)',
    program_type: 'hi_tikrar',
    instructor: 'Tim Asatizah AQLI',
    musyrifah: 'Tim Musyrifah Tikrar',
    description:
      'Program hafalan Al-Qur’an terstruktur dengan metode repetisi 40x per maqta dan 10x gabungan untuk membangun hafalan yang mutqin.',
    schedule: 'Setiap Hari (Mandiri & Setoran Terjadwal)',
    level: 'Semua Level',
    duration_weeks: 16,
    is_premium: true,
    has_exam: true,
    has_certificate: true,
    workspaceHref: '/tikrar',
    highlights: [
      'Simak murattal per ayat 5x siklus otomatis sebelum menghafal',
      'Target repetisi 40x per maqta & 10x penggabungan blok halaman',
      'Simulasi ujian sambung ayat & pengajuan ujian lisan resmi',
    ],
  },
  'tikrar-premium': {
    id: 'tikrar-premium',
    title: 'Hi Tikrar (Tikrar Daily)',
    program_type: 'hi_tikrar',
    instructor: 'Tim Asatizah AQLI',
    musyrifah: 'Tim Musyrifah Tikrar',
    description:
      'Program hafalan Al-Qur’an terstruktur dengan metode repetisi 40x per maqta dan pendampingan ujian halaman.',
    schedule: 'Setiap Hari (Mandiri)',
    level: 'Semua Level',
    duration_weeks: 16,
    is_premium: true,
    has_exam: true,
    has_certificate: true,
    workspaceHref: '/tikrar',
    highlights: [
      'Metode repetisi 40x terukur di seluruh 30 Juz',
      'Evaluasi teori tajwid & simulasi ujian per halaman',
      'Pendampingan musyrifah dan ujian lisan',
    ],
  },
  'mufradat-premium': {
    id: 'mufradat-premium',
    title: 'Hi Mufradat',
    program_type: 'hi_mufradat',
    instructor: 'Tim Asatizah AQLI',
    musyrifah: 'Musyrifah Hi Mufradat',
    description:
      'Program penguasaan kosakata Al-Qur’an per halaman dengan kuis interaktif, monitoring pekanan, dan grup pendampingan WhatsApp.',
    schedule: 'Senin – Jumat (Toleransi s/d Ahad)',
    level: 'Semua Level',
    duration_weeks: 20,
    is_premium: true,
    has_exam: true,
    has_certificate: true,
    workspaceHref: '/mufradat',
    highlights: [
      'Target ringan & konsisten 1 halaman mushaf per pekan',
      'Kuis interaktif arti kata per ayat + papan peringkat liga',
      'Pendampingan grup WhatsApp bersama Mu’allimah & Musyrifah',
    ],
  },
  'tafsir-j30': {
    id: 'tafsir-j30',
    title: "Tafsir Juz' Amma",
    program_type: 'hi_ngaji',
    instructor: 'Dr. Fatima Ahmed',
    description:
      'Kajian tadabbur makna, asbabun nuzul, dan pelajaran praktis dari surat-surat pendek pada Juz 30 yang dibaca sehari-hari.',
    schedule: 'Sabtu, 10:00 WIB',
    level: 'Pemula',
    duration_weeks: 12,
    is_premium: false,
    has_exam: false,
    has_certificate: true,
    workspaceHref: '/tilawah',
    highlights: [
      'Memahami kandungan surat-surat Juz 30 secara sistematis',
      'Catatan faidah tadabbur aplikatif untuk keseharian',
      'Diskusi interaktif bersama pemateri',
    ],
  },
  'tajwid-adv': {
    id: 'tajwid-adv',
    title: 'Tajwid Lanjutan: Sifaat Al-Huroof',
    program_type: 'hi_ngaji',
    instructor: 'Syekh Yusuf Ibrahim',
    description:
      'Pendalaman makharijul huruf dan shifatul huruf secara teoritis maupun praktik talaqqi agar bacaan Al-Qur’an semakin fasih.',
    schedule: 'Senin & Rabu, 19:00 WIB',
    level: 'Lanjutan',
    duration_weeks: 12,
    is_premium: false,
    has_exam: true,
    has_certificate: true,
    workspaceHref: '/tikrar/quiz',
    highlights: [
      'Bedah detail makhraj dan sifat huruf hijaiyah',
      'Koreksi kesalahan umum (lahn jali & lahn khafi)',
      'Evaluasi teori dan praktik bacaan',
    ],
  },
  'sirah-nabi': {
    id: 'sirah-nabi',
    title: 'Sirah Nabi (SAW)',
    program_type: 'hi_ngaji',
    instructor: 'Ustadha Aisha Khan',
    description:
      'Menelusuri perjalanan hidup Rasulullah ﷺ dari fase Makkah hingga Madinah untuk meneladani akhlak dan keteguhan beliau.',
    schedule: 'Minggu, 14:00 WIB',
    level: 'Semua Level',
    duration_weeks: 12,
    is_premium: false,
    has_exam: false,
    has_certificate: true,
    workspaceHref: '/mutabaah',
    highlights: [
      'Kronologi lengkap fase Makkah dan Madinah',
      'Hikmah keteladanan adab & keluarga muslimah',
      'Integrasi amalan sunnah harian di Hi Mutaba’ah',
    ],
  },
};

function resolveWorkspaceByProgramType(programType?: string, id?: string): string {
  if (id && STATIC_CIRCLES[id]) return STATIC_CIRCLES[id].workspaceHref;
  const pt = (programType || '').toLowerCase();
  if (pt.includes('mufradat')) return '/mufradat';
  if (pt.includes('tikrar')) return '/tikrar';
  if (pt.includes('matan')) return '/matan';
  if (pt.includes('ngaji') || pt.includes('tajwid') || pt.includes('tahsin')) return '/ngaji';
  return '/tilawah';
}

export default function StudyCircleDetailPage() {
  const params = useParams();
  const rawId = decodeURIComponent((params.id as string) || '');
  const isUuid = UUID_RE.test(rawId);

  const { user } = useUser();
  const { data: userData } = useDoc(user ? 'users' : null, user?.id);

  const { data: dbHalaqah, isLoading: isHalaqahLoading } = useDoc(
    isUuid ? 'halaqahs' : null,
    isUuid ? rawId : null
  );

  const regOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    }),
    [user?.id]
  );

  const { data: userRegs } = useCollection(user ? 'halaqah_registrations' : null, regOptions);

  const circle = useMemo(() => {
    if (dbHalaqah) {
      const workspaceHref = resolveWorkspaceByProgramType(dbHalaqah.program_type, rawId);
      return {
        id: dbHalaqah.id,
        title: dbHalaqah.title,
        program_type: dbHalaqah.program_type || 'halaqah',
        instructor: dbHalaqah.muallimah || 'Tim Asatizah AQLI',
        musyrifah: dbHalaqah.musyrifah || undefined,
        description:
          dbHalaqah.description ||
          'Program pembelajaran dan pembinaan intensif bersama Tim Asatizah & Musyrifah Hi AQLI.',
        schedule: dbHalaqah.schedule || 'Jadwal Fleksibel',
        level: dbHalaqah.level || 'Semua Level',
        duration_weeks: Number(dbHalaqah.duration_weeks) || 12,
        is_premium: Boolean(dbHalaqah.is_premium),
        has_exam: dbHalaqah.has_exam !== false,
        has_certificate: dbHalaqah.has_certificate !== false,
        start_date: dbHalaqah.start_date,
        end_date: dbHalaqah.end_date,
        quota: dbHalaqah.quota,
        workspaceHref,
        highlights: [
          'Kurikulum terarah bersama Mu’allimah & Musyrifah pendamping',
          'Monitoring keaktifan berkala melalui dashboard Sahabat AQLI',
          dbHalaqah.has_certificate !== false
            ? 'Evaluasi akhir & syahadah kelulusan program'
            : 'Materi terstruktur yang dapat diakses kapan saja',
        ],
      };
    }
    if (STATIC_CIRCLES[rawId]) {
      return STATIC_CIRCLES[rawId];
    }
    return null;
  }, [dbHalaqah, rawId]);

  const enrollmentStatus = useMemo(() => {
    if (!user) return 'guest';
    const reg = userRegs?.find(
      (r: any) =>
        r.halaqah_id === rawId ||
        (circle?.title && r.halaqah_title?.toLowerCase() === circle.title.toLowerCase())
    );
    if (reg) {
      if (['active', 'verified'].includes(reg.status)) return 'active';
      if (reg.status === 'pending_verification' || reg.status === 'pending') return 'pending';
    }
    if (Array.isArray(userData?.followed_halaqahs) && userData.followed_halaqahs.includes(rawId)) {
      return 'active';
    }
    if ((rawId === 'tikrar-j30-b1' || rawId === 'tikrar-premium') && userData?.is_tikrar_paid) {
      return 'active';
    }
    if (
      (rawId === 'mufradat-premium' || circle?.program_type === 'hi_mufradat') &&
      userData?.mufradat_status === 'active'
    ) {
      return 'active';
    }
    return 'none';
  }, [user, userRegs, rawId, circle, userData]);

  if (isUuid && isHalaqahLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Memuat Ruang Halaqah...
        </p>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-[#800000]/10 text-[#800000] flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black font-headline">Kelas Halaqah Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground">
            Kelas yang Ukhti cari mungkin telah berakhir atau berpindah ke katalog program terbaru.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/profile">Kembali ke Profil</Link>
          </Button>
          <Button asChild className="rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold">
            <Link href="/study-circles">Lihat Katalog Halaqah</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-8 pb-32">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-xl text-[#800000] hover:bg-[#800000]/5">
          <Link href="/study-circles">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]">
            Detail Program Halaqah
          </span>
          <h1 className="text-2xl font-black font-headline tracking-tight">{circle.title}</h1>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <div className="bg-gradient-to-br from-[#800000] to-[#4d0000] p-8 sm:p-10 text-white space-y-5 border-b-4 border-[#D4AF37]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#D4AF37] text-black border-none font-black text-[10px] uppercase tracking-widest">
              {circle.level}
            </Badge>
            {enrollmentStatus === 'active' && (
              <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase tracking-widest">
                PESERTA AKTIF
              </Badge>
            )}
            {enrollmentStatus === 'pending' && (
              <Badge className="bg-amber-500 text-white border-none font-black text-[10px] uppercase tracking-widest">
                MENUNGGU VERIFIKASI ADMIN
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black font-headline leading-tight">{circle.title}</h2>
            <p className="text-sm text-white/85 leading-relaxed">{circle.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                <UserIcon className="w-3.5 h-3.5" /> Pengampu
              </div>
              <p className="text-xs font-black mt-1">{circle.instructor}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                <Clock className="w-3.5 h-3.5" /> Jadwal Belajar
              </div>
              <p className="text-xs font-black mt-1">{circle.schedule}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                <Calendar className="w-3.5 h-3.5" /> Durasi Program
              </div>
              <p className="text-xs font-black mt-1">{circle.duration_weeks} Pekan</p>
            </div>
          </div>
        </div>

        <CardContent className="p-8 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#800000] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Fokus & Keunggulan Kelas
            </h3>
            <div className="grid gap-3">
              {circle.highlights.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {circle.has_exam && (
              <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-[#800000]/20 text-[#800000] font-bold gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Evaluasi Terukur
              </Badge>
            )}
            {circle.has_certificate && (
              <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-amber-300 text-amber-800 bg-amber-50 font-bold gap-1.5">
                <Award className="w-3.5 h-3.5" /> Syahadah Kelulusan
              </Badge>
            )}
            {circle.musyrifah && (
              <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-emerald-200 text-emerald-800 bg-emerald-50 font-bold gap-1.5">
                <Users className="w-3.5 h-3.5" /> Musyrifah: {circle.musyrifah}
              </Badge>
            )}
          </div>

          <div
            className={cn(
              'p-6 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
              enrollmentStatus === 'active'
                ? 'bg-emerald-50/70 border-emerald-200'
                : enrollmentStatus === 'pending'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-[#800000]/5 border-[#800000]/15'
            )}
          >
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                {enrollmentStatus === 'active'
                  ? 'Ukhti Terdaftar Aktif di Kelas Ini'
                  : enrollmentStatus === 'pending'
                    ? 'Pendaftaran Sedang Diverifikasi Admin'
                    : 'Siap Bergabung di Halaqah Ini?'}
              </p>
              <p className="text-xs text-muted-foreground">
                {enrollmentStatus === 'active'
                  ? 'Lanjutkan pembelajaran dan target harian langsung di ruang belajar.'
                  : enrollmentStatus === 'pending'
                    ? 'Mohon menunggu konfirmasi Admin atau buka ruang belajar mandiri sambil menunggu.'
                    : 'Daftarkan diri sekarang untuk mendapatkan akses bimbingan penuh.'}
              </p>
            </div>

            {enrollmentStatus === 'active' ? (
              <Button
                asChild
                className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shrink-0"
              >
                <Link href={circle.workspaceHref}>
                  Masuk Ruang Belajar <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            ) : enrollmentStatus === 'pending' ? (
              <Button
                asChild
                variant="outline"
                className="h-12 px-6 rounded-xl border-amber-500 text-amber-800 font-black uppercase tracking-widest shrink-0"
              >
                <Link href={circle.workspaceHref}>
                  <Timer className="w-4 h-4 mr-2" /> Pratinjau Materi
                </Link>
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-5 rounded-xl border-[#800000]/20 text-[#800000] font-bold"
                >
                  <Link href={circle.workspaceHref}>Lihat Materi</Link>
                </Button>
                <Button
                  asChild
                  className="h-12 px-6 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-black uppercase tracking-widest"
                >
                  <Link href={`/study-circles/registration?id=${encodeURIComponent(rawId)}`}>
                    Daftar Kelas <ArrowRight className="w-4 h-4 ml-2 text-[#D4AF37]" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
