  // Analisis aktivitas sub-blok terkini dari tikrar_user_progress
  const activeStageInfo = useMemo(() => {
    if (!allUserProgress || allUserProgress.length === 0) return null;

    // Helper untuk mendeteksi apakah suatu record benar-benar memiliki riwayat latihan
    const hasActivity = (p: any) => {
      if (!p) return false;
      if (Number(p.prep_listen_count) > 0 || Boolean(p.prep_translation_done)) return true;
      if (Number(p.total_progress) > 0) return true;
      const bObj = typeof p.blocks === 'object' && p.blocks !== null ? p.blocks : {};
      for (const b of [1, 2, 3, 4] as const) {
        if (
          Number(bObj[b]?.a?.count) > 0 ||
          Number(bObj[b]?.b?.count) > 0 ||
          Number(bObj[b]?.combined?.count) > 0
        ) {
          return true;
        }
      }
      return false;
    };

    // Prioritaskan halaman target pengguna jika memiliki aktivitas, jika tidak cari halaman terakhir yang ada aktivitasnya
    const recProg = allUserProgress.find((p: any) => Number(p.page_number) === recommendedPage);
    const matched =
      (hasActivity(recProg) ? recProg : null) ||
      allUserProgress.find(hasActivity) ||
      recProg ||
      allUserProgress[0];

    if (!matched) return null;

    const pageNumber = Number(matched.page_number) || recommendedPage;
    const juzNum = Number(matched.juz) || getJuzForPage(pageNumber);
    const totalProg = Number(matched.total_progress) || 0;
    const blocksObj =
      typeof matched.blocks === 'object' && matched.blocks !== null ? matched.blocks : {};
    const metaObj =
      typeof matched.meta_counts === 'object' && matched.meta_counts !== null
        ? matched.meta_counts
        : {};
    const prepListen = Number(matched.prep_listen_count) || 0;
    const prepTrans = Boolean(matched.prep_translation_done);

    let tuntasCount = 0;
    let activeSub: {
      stageName: string;
      subBlockLetter: string;
      currentCount: number;
      targetCount: number;
      badgeText: string;
      isStarted: boolean;
    } | null = null;

    for (const b of [1, 2, 3, 4] as const) {
      const letter = BLOCK_LETTERS[b];
      const bData = blocksObj[b] || {};
      const aCount = Number(bData.a?.count) || 0;
      const bCount = Number(bData.b?.count) || 0;
      const combCount = Number(bData.combined?.count) || 0;

      if (combCount >= 40) {
        tuntasCount += 1;
        continue;
      }

      if (combCount > 0) {
        activeSub = {
          stageName: `Penggabungan Blok ${letter} (Sub-blok A & B)`,
          subBlockLetter: `Blok ${letter} Gabung`,
          currentCount: combCount,
          targetCount: 40,
          badgeText: `Blok ${letter}`,
          isStarted: true,
        };
        break;
      } else if (bCount > 0) {
        activeSub = {
          stageName: `Blok ${letter}-2 (Sub-blok Bagian Kedua)`,
          subBlockLetter: `Blok ${letter}-2`,
          currentCount: bCount,
          targetCount: 40,
          badgeText: `Blok ${letter}-2`,
          isStarted: true,
        };
        break;
      } else if (aCount > 0) {
        activeSub = {
          stageName: `Blok ${letter}-1 (Sub-blok Bagian Pertama)`,
          subBlockLetter: `Blok ${letter}-1`,
          currentCount: aCount,
          targetCount: 40,
          badgeText: `Blok ${letter}-1`,
          isStarted: true,
        };
        break;
      } else if (!activeSub) {
        activeSub = {
          stageName: `Blok ${letter}-1 (Sub-blok Bagian Pertama)`,
          subBlockLetter: `Blok ${letter}-1`,
          currentCount: 0,
          targetCount: 40,
          badgeText: `Blok ${letter}-1`,
          isStarted: false,
        };
        break;
      }
    }

    if (!activeSub || (!activeSub.isStarted && tuntasCount === 0)) {
      if (prepListen < 5) {
        activeSub = {
          stageName: 'Tahap Persiapan: Simak Murattal 5x',
          subBlockLetter: 'Simak Murattal',
          currentCount: prepListen,
          targetCount: 5,
          badgeText: 'Persiapan',
          isStarted: prepListen > 0,
        };
      } else if (!prepTrans) {
        activeSub = {
          stageName: 'Tahap Persiapan: Baca & Pahami Terjemahan',
          subBlockLetter: 'Terjemahan',
          currentCount: 0,
          targetCount: 1,
          badgeText: 'Persiapan',
          isStarted: true,
        };
      }
    }

    if (tuntasCount === 4) {
      const meta1234 = Number(metaObj['1_2_3_4']) || 0;
      if (meta1234 < 10) {
        activeSub = {
          stageName: 'Penggabungan 1 Halaman Penuh (Blok A–D)',
          subBlockLetter: 'Blok A–D (10x)',
          currentCount: meta1234,
          targetCount: 10,
          badgeText: 'Gabung 1 Hal',
          isStarted: true,
        };
      } else {
        activeSub = {
          stageName: '1 Halaman Penuh Tuntas Mutqin!',
          subBlockLetter: 'Tuntas Mutqin',
          currentCount: 10,
          targetCount: 10,
          badgeText: 'Tuntas',
          isStarted: true,
        };
      }
    }

    const stage = activeSub || {
      stageName: 'Blok A-1 (Sub-blok Bagian Pertama)',
      subBlockLetter: 'Blok A-1',
      currentCount: 0,
      targetCount: 40,
      badgeText: 'Blok A-1',
      isStarted: false,
    };

    const percent =
      stage.targetCount > 0
        ? Math.min(100, Math.round((stage.currentCount / stage.targetCount) * 100))
        : 0;

    return {
      pageNumber,
      juz: juzNum,
      stageName: stage.stageName,
      subBlockLetter: stage.subBlockLetter,
      badgeText: stage.badgeText,
      currentCount: stage.currentCount,
      targetCount: stage.targetCount,
      percent,
      totalProgress: totalProg,
      tuntasCount,
      blocksObj,
      isStarted: stage.isStarted || hasActivity(matched),
    };
  }, [allUserProgress, recommendedPage]);