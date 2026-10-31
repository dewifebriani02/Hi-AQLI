import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAuthContext } from '@/lib/auth-server';
import { isStaff } from '@/lib/db-policy';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// Only inert file types. No .svg/.html/.js: they would be served from our origin and
// could run script in a visitor's browser.
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.pdf']);

// Folders non-staff (including anonymous donors) may upload into.
const PUBLIC_UPLOAD_FOLDERS = new Set(['donations']);

// Each path segment: letters, digits, dash, underscore, dot (no leading dot).
const SAFE_SEGMENT = /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/;

function resolveRelativePath(customPath: string | null, bucket: string, fileName: string): string {
  let relative: string;
  if (customPath) {
    relative = customPath.replace(/^\/+/, '');
  } else {
    const ext = path.extname(fileName).toLowerCase() || '.jpg';
    relative = `${bucket}/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
  }

  const segments = relative.split('/');
  if (segments.length === 0 || segments.length > 3 || !segments.every((s) => SAFE_SEGMENT.test(s) && s !== '..')) {
    throw new Error('Path file tidak valid.');
  }
  return segments.join('/');
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext(req);

    const formData = await req.formData();
    const file = formData.get('file');
    const bucketRaw = (formData.get('bucket') as string) || 'uploads';
    const customPath = formData.get('path') as string | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: { message: 'File wajib diunggah.' } }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: { message: 'Ukuran file maksimal 10 MB.' } }, { status: 413 });
    }
    if (!SAFE_SEGMENT.test(bucketRaw)) {
      return NextResponse.json({ error: { message: 'Bucket tidak valid.' } }, { status: 400 });
    }

    let relativeFilePath: string;
    try {
      relativeFilePath = resolveRelativePath(customPath, bucketRaw, file.name);
    } catch (e: any) {
      return NextResponse.json({ error: { message: e.message } }, { status: 400 });
    }

    const ext = path.extname(relativeFilePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: { message: 'Tipe file tidak diizinkan.' } }, { status: 400 });
    }

    // Non-staff may only upload into the public folders (e.g. donation proofs).
    const topFolder = relativeFilePath.includes('/') ? relativeFilePath.split('/')[0] : '';
    if (!isStaff(ctx) && !PUBLIC_UPLOAD_FOLDERS.has(topFolder)) {
      return NextResponse.json(
        { error: { message: ctx.userId ? 'Akses ditolak.' : 'Silakan login terlebih dahulu.' } },
        { status: ctx.userId ? 403 : 401 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const fullPath = path.resolve(uploadDir, relativeFilePath);
    // Defense in depth: the resolved path must stay inside the uploads directory.
    if (!fullPath.startsWith(uploadDir + path.sep)) {
      return NextResponse.json({ error: { message: 'Path file tidak valid.' } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await mkdir(path.dirname(fullPath), { recursive: true });
    try {
      // 'wx' refuses to overwrite an existing file.
      await writeFile(fullPath, buffer, { flag: 'wx' });
    } catch (e: any) {
      if (e?.code === 'EEXIST') {
        return NextResponse.json({ error: { message: 'File dengan nama ini sudah ada.' } }, { status: 409 });
      }
      throw e;
    }

    const publicUrl = `/uploads/${relativeFilePath}`;

    return NextResponse.json({
      data: {
        path: relativeFilePath,
        url: publicUrl,
        fullUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hiaqli.pro'}${publicUrl}`,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[UPLOAD_ERROR]', err);
    return NextResponse.json({ error: { message: 'Gagal mengupload file' } }, { status: 500 });
  }
}
