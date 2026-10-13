/**
 * Seed data contoh untuk Rotanami.
 * - Katalog keluarga & tanaman: data contoh bawaan (ditandai is_seed).
 * - Satu akun demo: demo@rotanami.id / rotanami123 dengan kebun berisi data contoh.
 * Jalankan: npx tsx src/db/seed.ts
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  crops,
  farmMembers,
  farms,
  observations,
  plantFamilies,
  plantings,
  plots,
  reminders,
  rotationPlans,
  seasons,
  soilTests,
  users,
} from "./schema";
import { hashPassword } from "@/lib/password";
import { addDaysISO, todayISO } from "@/lib/format";

const DEMO_EMAIL = "demo@rotanami.id";
const DEMO_PASSWORD = "rotanami123";

const FAMILIES: { name: string; rotationGroup: string }[] = [
  { name: "Solanaceae", rotationGroup: "Sayuran buah (terung-terungan)" },
  { name: "Brassicaceae", rotationGroup: "Kubis-kubisan" },
  { name: "Fabaceae", rotationGroup: "Polong-polongan" },
  { name: "Cucurbitaceae", rotationGroup: "Labu-labuan" },
  { name: "Apiaceae", rotationGroup: "Wortel-wortelan" },
  { name: "Amaranthaceae", rotationGroup: "Bayam-bayaman" },
  { name: "Alliaceae", rotationGroup: "Bawang-bawangan" },
  { name: "Poaceae", rotationGroup: "Rumput-rumputan" },
  { name: "Lamiaceae", rotationGroup: "Mint-mintan" },
  { name: "Asteraceae", rotationGroup: "Aster-asteran" },
  { name: "Convolvulaceae", rotationGroup: "Kangkung-kangkungan" },
];

interface SeedCrop {
  name: string;
  scientificName: string | null;
  family: string;
  nutrientCategory: "heavy" | "light" | "giver" | null;
  isCoverCrop?: boolean;
  notes?: string;
}

const CROPS: SeedCrop[] = [
  { name: "Tomat", scientificName: "Solanum lycopersicum", family: "Solanaceae", nutrientCategory: "heavy", notes: "Butuh sinar penuh dan drainase baik. Hindari menanam beruntun di petak yang sama dengan cabai/terong." },
  { name: "Cabai rawit", scientificName: "Capsicum frutescens", family: "Solanaceae", nutrientCategory: "heavy" },
  { name: "Terong", scientificName: "Solanum melongena", family: "Solanaceae", nutrientCategory: "heavy" },
  { name: "Sawi pakcoy", scientificName: "Brassica rapa subsp. chinensis", family: "Brassicaceae", nutrientCategory: "heavy", notes: "Panen relatif cepat; perhatikan ulat daun pada keluarga kubis." },
  { name: "Kubis", scientificName: "Brassica oleracea", family: "Brassicaceae", nutrientCategory: "heavy" },
  { name: "Brokoli", scientificName: "Brassica oleracea var. italica", family: "Brassicaceae", nutrientCategory: "heavy" },
  { name: "Kacang panjang", scientificName: "Vigna unguiculata", family: "Fabaceae", nutrientCategory: "giver" },
  { name: "Buncis", scientificName: "Phaseolus vulgaris", family: "Fabaceae", nutrientCategory: "giver", notes: "Termasuk legum yang membantu menambah nitrogen tanah." },
  { name: "Kacang tanah", scientificName: "Arachis hypogaea", family: "Fabaceae", nutrientCategory: "giver", isCoverCrop: true, notes: "Bisa berfungsi sebagai penutup tanah; memperbaiki nitrogen." },
  { name: "Jagung manis", scientificName: "Zea mays", family: "Poaceae", nutrientCategory: "heavy" },
  { name: "Mentimun", scientificName: "Cucumis sativus", family: "Cucurbitaceae", nutrientCategory: "heavy" },
  { name: "Labu kuning", scientificName: "Cucurbita moschata", family: "Cucurbitaceae", nutrientCategory: "heavy" },
  { name: "Wortel", scientificName: "Daucus carota", family: "Apiaceae", nutrientCategory: "light", notes: "Menyukai tanah gembur; hindari nitrogen berlebih agar umbi tidak bercabang." },
  { name: "Bayam hijau", scientificName: "Amaranthus tricolor", family: "Amaranthaceae", nutrientCategory: "light" },
  { name: "Kangkung", scientificName: "Ipomoea aquatica", family: "Convolvulaceae", nutrientCategory: "light" },
  { name: "Selada", scientificName: "Lactuca sativa", family: "Asteraceae", nutrientCategory: "light" },
  { name: "Bawang merah", scientificName: "Allium cepa", family: "Alliaceae", nutrientCategory: "light" },
  { name: "Kemangi", scientificName: "Ocimum basilicum", family: "Lamiaceae", nutrientCategory: "light", notes: "Sering ditanam sebagai tanaman pendamping." },
];

async function seedCatalog(): Promise<Map<string, number>> {
  const existingFams = await db.select().from(plantFamilies);
  const famId = new Map<string, number>(existingFams.map((f) => [f.name, f.id]));
  for (const fam of FAMILIES) {
    if (!famId.has(fam.name)) {
      const inserted = await db
        .insert(plantFamilies)
        .values({ name: fam.name, rotationGroup: fam.rotationGroup })
        .returning();
      famId.set(fam.name, inserted[0].id);
    }
  }

  const cropCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(crops);
  if ((cropCount[0]?.n ?? 0) === 0) {
    await db.insert(crops).values(
      CROPS.map((c) => ({
        name: c.name,
        scientificName: c.scientificName,
        familyId: famId.get(c.family) ?? null,
        nutrientCategory: c.nutrientCategory,
        isCoverCrop: c.isCoverCrop ?? false,
        isSeed: true,
        notes: c.notes ?? null,
      })),
    );
    console.log(`✓ Katalog: ${FAMILIES.length} keluarga dan ${CROPS.length} tanaman contoh dibuat.`);
  } else {
    console.log("• Katalog sudah berisi data; dilewati.");
  }
  return famId;
}

async function seedDemoUser(): Promise<number | null> {
  const existing = await db.select().from(users).where(eq(users.email, DEMO_EMAIL));
  if (existing.length > 0) {
    console.log("• Akun demo sudah ada; data contoh dilewati.");
    return null;
  }
  const inserted = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      name: "Petani Contoh",
    })
    .returning();
  console.log(`✓ Akun demo dibuat: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  return inserted[0].id;
}

async function seedDemoFarm(userId: number) {
  const today = todayISO();
  const d = (offset: number) => addDaysISO(today, offset);

  const farm = (
    await db
      .insert(farms)
      .values({
        ownerId: userId,
        name: "Kebun Contoh Rotanami",
        location: "Data contoh — Lembang, Jawa Barat",
        timezone: "Asia/Jakarta",
      })
      .returning()
  )[0];

  await db.insert(farmMembers).values({ farmId: farm.id, userId, role: "pemilik" });

  const season = (
    await db
      .insert(seasons)
      .values({
        farmId: farm.id,
        name: "Musim Tanam 2026",
        startDate: d(-45),
        endDate: d(120),
      })
      .returning()
  )[0];

  const [plotA, plotB, plotC] = await db
    .insert(plots)
    .values([
      {
        farmId: farm.id,
        name: "Bedeng A — Sayuran Buah",
        size: "12",
        areaUnit: "m2",
        soilType: "Lempung berpasir",
        notes: "(Data contoh) Bedeng utama untuk tomat dan cabai.",
      },
      {
        farmId: farm.id,
        name: "Bedeng B — Sayuran Daun",
        size: "8",
        areaUnit: "m2",
        soilType: "Lempung",
        notes: "(Data contoh) Fokus sayuran daun dan kubis-kubisan.",
      },
      {
        farmId: farm.id,
        name: "Bedeng C — Polong & Penutup Tanah",
        size: "10",
        areaUnit: "m2",
        soilType: "Liat berdebu",
        notes: "(Data contoh) Dipakai bergilir dengan legum.",
      },
    ])
    .returning();

  const cropByName = new Map(
    (await db.select().from(crops)).map((c) => [c.name, c]),
  );
  const cropId = (name: string) => cropByName.get(name)?.id ?? null;

  const tomat = cropId("Tomat")!;
  const cabai = cropId("Cabai rawit")!;
  const terong = cropId("Terong")!;
  const pakcoy = cropId("Sawi pakcoy")!;
  const bayam = cropId("Bayam hijau")!;
  const kubis = cropId("Kubis")!;
  const kacangTanah = cropId("Kacang tanah")!;
  const jagung = cropId("Jagung manis")!;

  const plantingRows = await db
    .insert(plantings)
    .values([
      { plotId: plotA.id, cropId: terong, seasonId: season.id, plantDate: d(-200), harvestDate: d(-150), status: "dipanen", yieldAmount: "9", yieldUnit: "kg", notes: "(Data contoh) Hasil cukup baik, sempat ada bercak daun." },
      { plotId: plotA.id, cropId: tomat, seasonId: season.id, plantDate: d(-120), harvestDate: d(-35), status: "dipanen", yieldAmount: "14", yieldUnit: "kg", notes: "(Data contoh)" },
      { plotId: plotA.id, cropId: cabai, plantDate: d(-30), harvestDate: null, status: "ditanam", notes: "(Data contoh) Sedang berbunga." },
      { plotId: plotB.id, cropId: pakcoy, plantDate: d(-80), harvestDate: d(-45), status: "dipanen", yieldAmount: "6", yieldUnit: "kg", notes: "(Data contoh)" },
      { plotId: plotB.id, cropId: bayam, plantDate: d(-20), harvestDate: null, status: "ditanam", notes: "(Data contoh)" },
      { plotId: plotB.id, cropId: kubis, plantDate: d(7), harvestDate: null, status: "direncanakan", notes: "(Data contoh) Bibit sudah disemai." },
      { plotId: plotC.id, cropId: kacangTanah, plantDate: d(-90), harvestDate: d(-25), status: "dipanen", yieldAmount: "5", yieldUnit: "kg", notes: "(Data contoh) Sekaligus penutup tanah." },
    ])
    .returning();

  const plantingOf = (crop: number, plotId: number) =>
    plantingRows.find((p) => p.cropId === crop && p.plotId === plotId)?.id ?? null;

  await db.insert(soilTests).values([
    { plotId: plotA.id, testDate: d(-100), ph: "6.2", nitrogen: "24", phosphor: "18", potassium: "30", organicMatter: "2.8", method: "Kit uji cepat (data contoh)", notes: "(Data contoh)" },
    { plotId: plotA.id, testDate: d(-10), ph: "6.8", nitrogen: null, phosphor: null, potassium: null, organicMatter: null, method: "pH meter digital (data contoh)", notes: "(Data contoh) Hanya mengukur pH." },
    { plotId: plotB.id, testDate: d(-30), ph: "5.9", nitrogen: "20", phosphor: "12", potassium: "22", organicMatter: "3.4", method: "Laboratorium daerah (data contoh)", notes: "(Data contoh) pH agak rendah." },
  ]);

  await db.insert(observations).values([
    { plotId: plotA.id, plantingId: plantingOf(cabai, plotA.id), category: "hama", obsDate: d(-12), description: "(Data contoh) Ulat grayak terlihat di beberapa tanaman cabai; sebagian sudah dibuang manual." },
    { plotId: plotA.id, plantingId: plantingOf(terong, plotA.id), category: "penyakit", obsDate: d(-160), description: "(Data contoh) Bercak daun pada terong saat musim hujan." },
    { plotId: plotB.id, plantingId: plantingOf(bayam, plotB.id), category: "pertumbuhan", obsDate: d(-5), description: "(Data contoh) Bayam tumbuh seragam, tinggi rata-rata 12 cm." },
    { plotId: plotC.id, plantingId: null, category: "cuaca", obsDate: d(-3), description: "(Data contoh) Hujan deras dua hari berturut-turut, drainase bedeng C perlu dicek." },
  ]);

  await db.insert(reminders).values([
    { farmId: farm.id, plotId: plotB.id, title: "Pasang mulsa di Bedeng B", dueDate: d(-2), done: false, notes: "(Data contoh)" },
    { farmId: farm.id, plotId: plotB.id, title: "Pindahkan bibit kubis ke bedeng", dueDate: d(3), done: false, notes: "(Data contoh)" },
    { farmId: farm.id, plotId: plotA.id, title: "Cek pH ulang Bedeng A", dueDate: d(14), done: false, notes: "(Data contoh)" },
  ]);

  await db.insert(rotationPlans).values({
    plotId: plotC.id,
    seasonId: season.id,
    cropId: jagung,
    targetDate: d(10),
    status: "aktif",
    rationale: {
      source: "saran-mesin",
      context: [
        "Tanaman terakhir: Kacang tanah (keluarga Fabaceae).",
        "Kacang tanah tergolong penyumbang hara dan penutup tanah.",
      ],
      reasons: [
        "Beda keluarga dengan tanaman terakhir.",
        "Tanaman terakhir penyumbang hara, sehingga cocok diikuti tanaman yang butuh banyak hara.",
      ],
      disclaimer:
        "Saran ini bersifat panduan umum berdasarkan riwayat petak dan data katalog, bukan diagnosis atau kepastian agronomi.",
    },
    notes: "(Data contoh) Rencana rotasi setelah kacang tanah.",
  });

  console.log("✓ Kebun contoh dibuat: 3 petak, riwayat tanam, uji tanah, observasi, pengingat, dan 1 rencana rotasi.");
}

async function main() {
  await seedCatalog();
  const userId = await seedDemoUser();
  if (userId !== null) {
    await seedDemoFarm(userId);
  }
  console.log("Selesai.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
