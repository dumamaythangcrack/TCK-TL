"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUploadUrls, createDocumentBundle } from "@/actions/upload";
import { getCategories, getGrades, getSubjects, seedTaxonomyIfEmpty } from "@/actions/taxonomy";
import { Upload, X, FileText, CheckCircle, AlertCircle, ArrowUp, ArrowDown, Play, Pause, RotateCw, Info } from "lucide-react";
import { toast } from "sonner";

interface FileUploadState {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  progress: number;
  status: "idle" | "uploading" | "paused" | "completed" | "failed";
  isPrimary: boolean;
  order: number;
  r2Key?: string;
  uploadUrl?: string;
  xhr?: XMLHttpRequest;
  thumbnailFile?: File;
  thumbnailUrl?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Manage Files, Step 2: Meta Info
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Taxonomy lists
  const [categories, setCategories] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load taxonomy data
  useEffect(() => {
    async function loadData() {
      await seedTaxonomyIfEmpty();
      
      const [cats, grds, subs] = await Promise.all([
        getCategories(),
        getGrades(),
        getSubjects(),
      ]);
      setCategories(cats);
      setGrades(grds);
      setSubjects(subs);
    }
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleClose = () => {
    files.forEach(f => {
      if (f.xhr) f.xhr.abort();
    });
    setFiles([]);
    setTitle("");
    setDescription("");
    setCategoryId("");
    setGradeId("");
    setSubjectId("");
    setTagsInput("");
    setStep(1);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (selectedFiles: File[]) => {
    const validExtensions = ["pdf", "docx", "pptx", "xlsx", "png", "jpg", "jpeg"];
    const newFiles: FileUploadState[] = [];

    selectedFiles.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!validExtensions.includes(ext)) {
        toast.error(`Định dạng file .${ext} của file "${file.name}" không được hỗ trợ!`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File "${file.name}" quá lớn (Giới hạn tối đa 50MB)!`);
        return;
      }

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        progress: 0,
        status: "idle",
        isPrimary: files.length === 0 && newFiles.length === 0,
        order: files.length + newFiles.length,
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToAbort = prev.find((f) => f.id === id);
      if (fileToAbort?.xhr) {
        fileToAbort.xhr.abort();
      }
      const updated = prev.filter((f) => f.id !== id);
      if (updated.length > 0 && !updated.some((f) => f.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated.map((f, index) => ({ ...f, order: index }));
    });
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= files.length) return;

    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[newIndex];
    newFiles[newIndex] = temp;

    setFiles(newFiles.map((f, i) => ({ ...f, order: i })));
  };

  const setPrimaryFile = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        isPrimary: f.id === id,
      }))
    );
  };

  const renameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  const startUpload = (fileId: string) => {
    const fileState = files.find((f) => f.id === fileId);
    if (!fileState || fileState.status === "completed") return;

    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "uploading" } : f))
    );

    getUploadUrls([
      {
        fileName: fileState.name,
        fileSize: fileState.size,
        mimeType: fileState.mimeType,
        isPrimary: fileState.isPrimary,
        sortOrder: fileState.order,
      },
    ])
      .then((res) => {
        if (res.success && res.uploads[0]) {
          const { uploadUrl, r2Key } = res.uploads[0];
          performXhrUpload(fileId, uploadUrl, r2Key);
        } else {
          markUploadFailed(fileId);
        }
      })
      .catch(() => {
        markUploadFailed(fileId);
      });
  };

  const performXhrUpload = (fileId: string, uploadUrl: string, r2Key: string) => {
    const fileState = files.find((f) => f.id === fileId);
    if (!fileState) return;

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", fileState.mimeType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: percentComplete } : f
          )
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "completed", progress: 100, r2Key }
              : f
          )
        );
        toast.success(`Đã tải lên thành công: ${fileState.name}`);
      } else {
        markUploadFailed(fileId);
      }
    };

    xhr.onerror = () => {
      markUploadFailed(fileId);
    };

    xhr.send(fileState.file);

    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, xhr } : f))
    );
  };

  const pauseUpload = (fileId: string) => {
    setFiles((prev) => {
      return prev.map((f) => {
        if (f.id === fileId) {
          if (f.xhr) f.xhr.abort();
          return { ...f, status: "paused", xhr: undefined };
        }
        return f;
      });
    });
    toast.info("Đã tạm dừng tải lên.");
  };

  const resumeUpload = (fileId: string) => {
    startUpload(fileId);
  };

  const markUploadFailed = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "failed", progress: 0 } : f
      )
    );
    toast.error("Tải lên thất bại. Vui lòng thử lại.");
  };

  const handleUploadAll = () => {
    files.forEach((file) => {
      if (file.status === "idle" || file.status === "failed") {
        startUpload(file.id);
      }
    });
  };

  const handleNextStep = () => {
    if (files.length === 0) {
      toast.warning("Vui lòng thêm ít nhất một tài liệu!");
      return;
    }
    const allCompleted = files.every((f) => f.status === "completed");
    if (!allCompleted) {
      toast.warning("Vui lòng đợi tất cả các file tải lên hoàn tất trước khi tiếp tục!");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Vui lòng điền tiêu đề bộ tài liệu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadFiles = files.map((f) => ({
        fileName: f.name,
        originalName: f.file.name,
        fileSize: f.size,
        mimeType: f.mimeType,
        fileExtension: f.name.split(".").pop() || "",
        r2Key: f.r2Key!,
        isPrimary: f.isPrimary,
        sortOrder: f.order,
      }));

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await createDocumentBundle({
        title,
        description,
        categoryId,
        gradeId,
        subjectId,
        files: payloadFiles,
        tags,
      });

      if (result.success) {
        toast.success("Bộ tài liệu đã được gửi và đang chờ duyệt từ quản trị viên!");
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Đã xảy ra lỗi khi tạo bộ tài liệu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 text-slate-800 rounded-3xl overflow-hidden p-0 shadow-lg bg-white">
        
        <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
            Đăng bộ tài liệu học tập mới
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs font-medium">
            {step === 1
              ? "Kéo thả nhiều file bài tập, đề kiểm tra để gom lại thành một liên kết học tập duy nhất."
              : "Hoàn tất các thông tin phân loại môn học và khối lớp giúp tài liệu tiếp cận được nhiều học sinh hơn."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Upload className="h-5 w-5 text-slate-500" />
              </div>
              <p className="font-bold text-xs text-slate-800">Kéo & Thả các file tài liệu vào đây</p>
              <p className="text-[10px] text-slate-400">hoặc nhấp chọn từ máy tính của bạn</p>
              <div className="flex gap-2 mt-1 text-[9px] text-slate-450 bg-slate-100 py-1 px-3 rounded-full font-medium">
                <span>Giới hạn: tối đa 50MB mỗi file (PDF, DOCX, PPTX, XLSX, Ảnh)</span>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Danh sách tài liệu ({files.length} file)
                  </h3>
                  <Button
                    onClick={handleUploadAll}
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-650 hover:bg-slate-50 text-xs h-7 px-2.5 rounded-lg"
                  >
                    Tải lên tất cả
                  </Button>
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {files.map((file, idx) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-xl border flex flex-col md:flex-row gap-3 justify-between items-start md:items-center transition-all ${
                        file.isPrimary
                          ? "border-blue-600/30 bg-blue-50/20"
                          : "border-slate-150 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 w-full md:w-auto truncate">
                        <FileText className="h-8 w-8 text-slate-400 shrink-0" />
                        <div className="space-y-0.5 w-full truncate">
                          <Input
                            value={file.name}
                            onChange={(e) => renameFile(file.id, e.target.value)}
                            className="bg-transparent border-0 hover:border hover:border-slate-200 focus:border-slate-350 focus:ring-0 text-slate-800 font-bold p-0 h-5 truncate text-xs focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.mimeType}
                          </p>
                        </div>
                      </div>

                      {/* Controls and Upload state */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
                        {/* Ordering */}
                        <div className="flex items-center gap-0.5">
                          <Button
                            onClick={() => moveFile(idx, "up")}
                            disabled={idx === 0}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-slate-700"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => moveFile(idx, "down")}
                            disabled={idx === files.length - 1}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-slate-700"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Primary Badge or Select Button */}
                        {file.isPrimary ? (
                          <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Chính
                          </span>
                        ) : (
                          <Button
                            onClick={() => setPrimaryFile(file.id)}
                            variant="ghost"
                            size="sm"
                            className="text-[10px] text-slate-450 hover:text-slate-800 hover:bg-slate-100 h-6 px-2 rounded-md"
                          >
                            Đặt làm chính
                          </Button>
                        )}

                        {/* Upload Status / Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.status === "idle" && (
                            <Button
                              onClick={() => startUpload(file.id)}
                              size="sm"
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-2.5 h-6 rounded-md"
                            >
                              Tải lên
                            </Button>
                          )}

                          {file.status === "uploading" && (
                            <div className="flex items-center gap-1.5">
                              <Progress value={file.progress} className="w-12 h-1 bg-slate-200" />
                              <span className="text-[9px] font-bold">{file.progress}%</span>
                              <Button
                                onClick={() => pauseUpload(file.id)}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-yellow-650"
                              >
                                <Pause className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {file.status === "paused" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-yellow-600 font-bold">Tạm dừng</span>
                              <Button
                                onClick={() => resumeUpload(file.id)}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-blue-600"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {file.status === "completed" && (
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                          )}

                          {file.status === "failed" && (
                            <div className="flex items-center gap-0.5">
                              <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                              <Button
                                onClick={() => startUpload(file.id)}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-blue-600"
                              >
                                <RotateCw className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <Button
                            onClick={() => removeFile(file.id)}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-slate-400 hover:text-red-650 rounded-md"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button onClick={handleClose} variant="ghost" className="text-xs hover:bg-slate-50 rounded-xl h-9">
                Hủy bỏ
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={files.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-2xs"
              >
                Tiếp tục nhập thông tin
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Metadata Details Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-slate-600">
                    Tiêu đề bộ tài liệu <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Đề thi thử môn Toán kỳ thi Tốt nghiệp THPT 2026"
                    required
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-350 focus:ring-0 rounded-xl text-xs md:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-bold text-slate-600">
                    Mô tả tài liệu học tập
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung chính, dạng bài tập kiểm tra ôn thi..."
                    rows={5}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-350 focus:ring-0 rounded-xl p-3 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Danh mục tài liệu</Label>
                  <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-9">
                      <SelectValue placeholder="Chọn danh mục phân loại" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-250 text-slate-800 text-xs">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Khối lớp</Label>
                    <Select value={gradeId} onValueChange={(val) => setGradeId(val || "")}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-9">
                        <SelectValue placeholder="Lớp học" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-250 text-slate-800 text-xs max-h-[160px]">
                        {grades.map((grd) => (
                          <SelectItem key={grd.id} value={grd.id}>
                            {grd.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Môn học</Label>
                    <Select value={subjectId} onValueChange={(val) => setSubjectId(val || "")}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl text-xs h-9">
                        <SelectValue placeholder="Môn học" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-250 text-slate-800 text-xs max-h-[160px]">
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tags" className="text-xs font-bold text-slate-600">
                    Từ khóa tìm kiếm (Tags, phân tách bằng dấu phẩy)
                  </Label>
                  <Input
                    id="tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="toan thpt, ôn thi tốt nghiệp, đề thử lớp 12"
                    className="bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-350 focus:ring-0 rounded-xl text-xs"
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between gap-2 pt-4 border-t border-slate-100">
              <Button onClick={() => setStep(1)} variant="ghost" className="text-xs hover:bg-slate-50 rounded-xl h-9">
                Quay lại quản lý file
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleClose} variant="ghost" className="text-xs hover:bg-slate-50 rounded-xl h-9">
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 h-9 rounded-xl shadow-2xs"
                >
                  {isSubmitting ? "Đang xử lý..." : "Gửi tài liệu phê duyệt"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
