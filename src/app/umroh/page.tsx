"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plane,
  Calendar,
  MapPin,
  Users,
  Star,
  Check,
  ChevronRight,
  Hotel,
  Ticket,
  Utensils,
  Bus,
  BookOpen,
  Clock,
  Shield,
  Heart,
  Luggage,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/supabase";

// Mock data for umrah packages
const umrahPackages = [
  {
    id: 1,
    name: "Paket Umrah Reguler 9 Hari",
    travel: "Al-Mabrur Travel",
    rating: 4.8,
    reviews: 245,
    price: 28500000,
    duration: "9 Hari",
    departure: "Jakarta (CGK)",
    hotel: "Hotel Elaf Kinda *4",
    distance: "300m dari Masjidil Haram",
    includes: ["Tiket Pesawat PP", "Hotel Bintang 4", "Makan 3x Sehari", "Visa Umrah", "Handling Airport", "Mutawwif Indonesia", "City Tour Makkah & Madinah"],
    seatsAvailable: 15,
    image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400",
    departureDates: ["15 Apr 2026", "20 Mei 2026", "10 Jun 2026"],
  },
  {
    id: 2,
    name: "Paket Umrah Plus Turki 12 Hari",
    travel: "Barokah Travel",
    rating: 4.9,
    reviews: 189,
    price: 35000000,
    duration: "12 Hari",
    departure: "Jakarta (CGK)",
    hotel: "Hotel Anjum *5",
    distance: "200m dari Masjidil Haram",
    includes: ["Tiket Pesawat PP", "Hotel Bintang 5", "Makan 3x Sehari", "Visa Umrah & Turki", "Handling Airport", "Mutawwif Indonesia", "Tour Istanbul & Bursa", "Hotel di Turki 3 Malam"],
    seatsAvailable: 8,
    image: "https://images.unsplash.com/photo-1542844154-745a502adee7?w=400",
    departureDates: ["5 Apr 2026", "15 Mei 2026"],
  },
  {
    id: 3,
    name: "Paket Umrah Hemat 9 Hari",
    travel: "Hikmah Travel",
    rating: 4.6,
    reviews: 312,
    price: 22500000,
    duration: "9 Hari",
    departure: "Surabaya (SUB)",
    hotel: "Hotel Ajyad *3",
    distance: "500m dari Masjidil Haram",
    includes: ["Tiket Pesawat PP", "Hotel Bintang 3", "Makan 2x Sehari", "Visa Umrah", "Handling Airport", "Mutawwif Indonesia"],
    seatsAvailable: 25,
    image: "https://images.unsplash.com/photo-1519245659620-e859806a8d3b?w=400",
    departureDates: ["1 Apr 2026", "10 Apr 2026", "25 Mei 2026"],
  },
  {
    id: 4,
    name: "Paket Umrah VIP 9 Hari",
    travel: "Al-Mabrur Travel",
    rating: 5.0,
    reviews: 98,
    price: 45000000,
    duration: "9 Hari",
    departure: "Jakarta (CGK)",
    hotel: "Hotel Clock Tower *5",
    distance: "50m dari Masjidil Haram",
    includes: ["Tiket Pesawat Business PP", "Hotel Bintang 5 Premium", "Makan Fullboard", "Visa Umrah", "Handling VIP", "Mutawwif Senior", "Private Bus AC", "City Tour Eksklusif"],
    seatsAvailable: 5,
    image: "https://images.unsplash.com/photo-1584811644165-33db3b146db5?w=400",
    departureDates: ["20 Apr 2026", "5 Jun 2026"],
  },
];

// Preparation guide data
const preparationSteps = [
  {
    category: "Persiapan Dokumen",
    icon: <Ticket className="w-5 h-5" />,
    items: [
      "Paspor berlaku min. 7 bulan",
      "Buku suntik meningitis",
      "KTP & KK",
      "Foto ukuran 4x6 (4 lembar)",
      "Akta kelahiran (untuk wanita <45 tahun)",
    ],
  },
  {
    category: "Persiapan Fisik & Kesehatan",
    icon: <Heart className="w-5 h-5" />,
    items: [
      "Cek kesehatan rutin",
      "Latihan jalan kaki 30 menit/hari",
      "Penuhi kebutuhan cairan",
      "Istirahat yang cukup",
      "Siapkan obat-obatan pribadi",
    ],
  },
  {
    category: "Persiapan Ibadah",
    icon: <BookOpen className="w-5 h-5" />,
    items: [
      "Pelajari tata cara Umrah",
      "Pelajari doa-doa Umrah",
      "Pelajari bacaan Talbiyah",
      "Pahami rukun Umrah",
      "Siapkan mukena/kemeja ihram",
    ],
  },
  {
    category: "Persiapan Koper",
    icon: <Luggage className="w-5 h-5" />,
    items: [
      "Pakaian ihram (putih) untuk laki-laki",
      "Mukena & pakaian sopan untuk wanita",
      "Perlengkapan mandi",
      "Sandal kamar & sandal jalan",
      "Obat-obatan pribadi",
      "Power bank & adapter",
      "Koper ukuran maks. 28kg",
    ],
  },
  {
    category: "Tips Selama di Tanah Suci",
    icon: <Star className="w-5 h-5" />,
    items: [
      "Jaga kesehatan & istirahat cukup",
      "Perbanyak minum air Zamzam",
      "Hindari makanan terlalu pedas",
      "Gunakan sandal anti-selip",
      "Bawa kartu hotel",
      "Patuhi jadwal yang diberikan mutawwif",
      "Jaga kesopanan & akhlak",
    ],
  },
];

export default function UmrohPage() {
  const { user } = useUser();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-2">
          <Plane className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#800000]">HI UMROH</span>
        </div>
        <h1 className="text-2xl font-bold font-headline tracking-tight leading-tight text-black">
          Paket Umrah & Persiapan Ibadah
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih paket umrah terbaik dan lengkapi persiapan ibadah Ukhti
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="packages" className="data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg font-bold text-sm">
            <Ticket className="w-4 h-4 mr-2" />
            Daftar Paket
          </TabsTrigger>
          <TabsTrigger value="preparation" className="data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg font-bold text-sm">
            <BookOpen className="w-4 h-4 mr-2" />
            Persiapan Ibadah
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-4 mt-4">
          {umrahPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`overflow-hidden border-2 transition-all hover:shadow-lg ${
                selectedPackage === pkg.id
                  ? "border-[#D4AF37] shadow-md"
                  : "border-transparent hover:border-amber-200"
              }`}
            >
              {/* Package Image */}
              <div className="h-32 bg-gradient-to-r from-[#800000] to-[#a32828] relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div>
                    <Badge className="bg-[#D4AF37] text-[#800000] text-[10px] font-black mb-1">
                      {pkg.travel}
                    </Badge>
                    <h3 className="text-white font-bold text-lg leading-tight">{pkg.name}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[#D4AF37] font-black text-xl">
                      Rp {(pkg.price / 1000000).toFixed(0)}jt
                    </div>
                    <div className="text-amber-200 text-[10px]">per orang</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Package Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {pkg.departure}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                    {pkg.rating} ({pkg.reviews})
                  </div>
                </div>

                {/* Hotel Info */}
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg mb-3">
                  <Hotel className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#800000]">{pkg.hotel}</div>
                    <div className="text-[10px] text-muted-foreground">{pkg.distance}</div>
                  </div>
                </div>

                {/* Includes */}
                <div className="mb-3">
                  <div className="text-xs font-bold text-muted-foreground mb-2">Fasilitas:</div>
                  <div className="flex flex-wrap gap-1">
                    {pkg.includes.slice(0, 4).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-[9px] border-amber-200 text-amber-700">
                        {item}
                      </Badge>
                    ))}
                    {pkg.includes.length > 4 && (
                      <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-700">
                        +{pkg.includes.length - 4} lagi
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Departure Dates & Action */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-muted-foreground mb-1">Keberangkatan:</div>
                    <div className="flex flex-wrap gap-1">
                      {pkg.departureDates.map((date, idx) => (
                        <Badge key={idx} className="bg-[#800000]/10 text-[#800000] text-[9px] font-normal">
                          {date}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">
                      {pkg.seatsAvailable} kursi tersisa
                    </div>
                    <Link href={user ? `/umroh/${pkg.id}/checkout` : "/login"}>
                      <Button
                        size="sm"
                        className="bg-[#800000] hover:bg-[#a32828] text-white text-xs font-bold mt-1"
                      >
                        Pilih <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More */}
          <div className="text-center">
            <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Lihat Semua Paket
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </TabsContent>

        {/* Preparation Tab */}
        <TabsContent value="preparation" className="space-y-4 mt-4">
          {preparationSteps.map((step, idx) => (
            <Card key={idx} className="border-l-4 border-[#800000]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#800000]">
                  <div className="p-1.5 rounded-lg bg-[#800000]/10 text-[#800000]">
                    {step.icon}
                  </div>
                  {step.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {step.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* Additional Info Card */}
          <Card className="bg-gradient-to-br from-[#800000]/5 to-amber-50 border-2 border-[#D4AF37]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#D4AF37]/20">
                  <Shield className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-[#800000] mb-1">Tips Penting</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pastikan Ukhti memilih paket yang sesuai dengan budget dan kebutuhan. Perhatikan jarak hotel
                    dengan Masjidil Haram, fasilitas yang disediakan, dan reputasi travel. Selalu berkoordinasi
                    dengan mutawwif selama di Tanah Suci.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-[#800000] to-[#a32828] border-none">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm">Siap Berangkat?</h4>
                <p className="text-amber-200 text-xs">Pilih paket umrah impian Ukhti sekarang</p>
              </div>
              <Link href="?tab=packages">
                <Button className="bg-[#D4AF37] hover:bg-amber-400 text-[#800000] font-bold">
                  Lihat Paket
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
