import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/files/parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Không nhận được tệp nào." }, { status: 400 });
    }

    if (file.size > 52_428_800) {
      return NextResponse.json({ success: false, error: "Tệp vượt quá giới hạn 50MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractedText = await parseFile(buffer, file.type, file.name);

    return NextResponse.json({
      success: true,
      text: extractedText,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error("[Parse API Route Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi trích xuất nội dung tệp." },
      { status: 500 }
    );
  }
}
