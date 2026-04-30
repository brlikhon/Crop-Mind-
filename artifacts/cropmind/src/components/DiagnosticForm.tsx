import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Gauge, Languages, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PRESETS = [
  "My rice leaves are yellowing with brown spots in Punjab, India",
  "Tomato plants showing late blight symptoms in Karnataka",
  "Coffee leaf rust spreading in Vietnam Central Highlands"
];

const LANGUAGES = [
  {
    label: "English",
    value: "English",
    speechLang: "en-US",
    placeholder: "E.g., I have 2 hectares of wheat in Sindh. I'm noticing white powdery spots on the lower leaves, and it's been unusually humid...",
  },
  {
    label: "বাংলা",
    value: "Bangla",
    speechLang: "bn-BD",
    placeholder: "যেমন: আমার ধানের পাতায় হলদে দাগ দেখা যাচ্ছে, এলাকায় কয়েকদিন ধরে আর্দ্রতা বেশি...",
  },
  {
    label: "हिन्दी",
    value: "Hindi",
    speechLang: "hi-IN",
    placeholder: "उदाहरण: मेरी गेहूं की फसल में पत्तियों पर सफेद पाउडर जैसे धब्बे दिख रहे हैं...",
  },
  {
    label: "Bahasa",
    value: "Bahasa Indonesia",
    speechLang: "id-ID",
    placeholder: "Contoh: Daun padi saya menguning dengan bercak cokelat setelah cuaca lembap...",
  },
  {
    label: "Tiếng Việt",
    value: "Vietnamese",
    speechLang: "vi-VN",
    placeholder: "Ví dụ: Lá cà phê có vết gỉ sắt lan nhanh sau nhiều ngày ẩm ướt...",
  },
  {
    label: "ไทย",
    value: "Thai",
    speechLang: "th-TH",
    placeholder: "ตัวอย่าง: ใบข้าวมีจุดสีน้ำตาลและเหลืองหลังจากฝนตกหลายวัน...",
  },
  {
    label: "اردو",
    value: "Urdu",
    speechLang: "ur-PK",
    placeholder: "مثال: گندم کے پتوں پر سفید سفوف جیسے دھبے ہیں اور موسم مرطوب ہے...",
  },
  {
    label: "Tagalog",
    value: "Tagalog",
    speechLang: "fil-PH",
    placeholder: "Halimbawa: Naninilaw ang dahon ng palay at may brown spots matapos ang maulang panahon...",
  },
];

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface ImageStats {
  originalBytes: number;
  optimizedBytes: number;
}

interface DiagnosticFormProps {
  onSubmit: (query: string, image: File | undefined, preferredLanguage: string) => void;
  isPending: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    image.src = url;
  });
}

async function optimizeImage(file: File, lowDataMode: boolean): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  const image = await loadImage(file);
  const maxDimension = lowDataMode ? 1280 : 1800;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  if (!lowDataMode && scale === 1 && file.size < 1_500_000) return file;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const outputType = lowDataMode || file.type !== "image/png" ? "image/jpeg" : file.type;
  const quality = lowDataMode ? 0.72 : 0.86;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, quality);
  });

  if (!blob || blob.size >= file.size) return file;

  const extension = outputType === "image/jpeg" ? "jpg" : "png";
  const name = file.name.replace(/\.[^.]+$/, "") || "crop-photo";
  return new File([blob], `${name}-optimized.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

export function DiagnosticForm({ onSubmit, isPending }: DiagnosticFormProps) {
  const [query, setQuery] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [lowDataMode, setLowDataMode] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const language = LANGUAGES.find((item) => item.value === preferredLanguage) ?? LANGUAGES[0];
  const windowWithSpeech = typeof window !== "undefined"
    ? window as Window & {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      }
    : undefined;
  const SpeechRecognitionCtor = windowWithSpeech?.SpeechRecognition ?? windowWithSpeech?.webkitSpeechRecognition;
  const speechSupported = Boolean(SpeechRecognitionCtor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    const imageOnlyQuery = imageFile
      ? "Please diagnose the attached crop photo. Crop and location were not provided."
      : "";
    const finalQuery = trimmedQuery || imageOnlyQuery;
    if (finalQuery && !isPending && !isOptimizingImage) {
      onSubmit(finalQuery, imageFile ?? undefined, preferredLanguage);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsOptimizingImage(true);
      setImageStats(null);
      try {
        const optimized = await optimizeImage(file, lowDataMode);
        setImageFile(optimized);
        setImagePreview(await readPreview(optimized));
        setImageStats({
          originalBytes: file.size,
          optimizedBytes: optimized.size,
        });
      } catch {
        setImageFile(file);
        setImagePreview(await readPreview(file));
        setImageStats({
          originalBytes: file.size,
          optimizedBytes: file.size,
        });
      } finally {
        setIsOptimizingImage(false);
      }
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!SpeechRecognitionCtor) {
      setVoiceMessage("Voice input is unavailable in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    const baseQuery = query.trim();
    recognition.lang = language.speechLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setQuery([baseQuery, transcript.trim()].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setVoiceMessage("Could not capture voice. Try typing instead.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setVoiceMessage("");
    setIsListening(true);
    recognition.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Expert Crop Intelligence
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Speak, type, or upload a crop photo. CropMind now supports multilingual farmer guidance and low-bandwidth field uploads.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden focus-within:border-primary/50 transition-colors">
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/20 border-b border-border/30">
            <label className="flex items-center gap-2 rounded-full bg-background border px-3 py-1.5 text-xs font-bold">
              <Languages className="w-3.5 h-3.5 text-primary" />
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={isPending}
                className="bg-transparent outline-none"
                aria-label="Preferred language"
              >
                {LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isPending || !speechSupported}
              title={speechSupported ? "Voice input" : "Voice input unavailable"}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
                isListening
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : "bg-background hover:bg-primary/5 hover:border-primary/40",
                (!speechSupported || isPending) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isListening ? "Stop" : "Voice"}
            </button>

            <label className="ml-auto flex items-center gap-2 rounded-full bg-background border px-3 py-1.5 text-xs font-bold">
              <Gauge className="w-3.5 h-3.5 text-secondary" />
              <input
                type="checkbox"
                checked={lowDataMode}
                onChange={(e) => setLowDataMode(e.target.checked)}
                disabled={isPending}
                className="accent-primary"
              />
              Low data
            </label>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isPending}
            placeholder={language.placeholder}
            className="w-full h-32 p-6 bg-transparent text-lg resize-none focus:outline-none disabled:opacity-50 placeholder:text-muted-foreground/60"
          />

          {imagePreview && (
            <div className="px-6 pb-3 flex items-center gap-3">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Crop photo"
                  className="h-16 w-16 rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{imageFile?.name}</p>
                {imageStats && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(imageStats.originalBytes)} to {formatBytes(imageStats.optimizedBytes)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/20 border-t border-border/30">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || isOptimizingImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border hover:bg-primary/5 hover:border-primary/40 transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {isOptimizingImage ? "Optimizing..." : imageFile ? "Change Photo" : "Add Photo"}
              </button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>{voiceMessage || `${language.label} output + compressed photo upload`}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={(!query.trim() && !imageFile) || isPending || isOptimizingImage}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300",
                (!query.trim() && !imageFile) || isPending || isOptimizingImage
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {isPending ? "Analyzing..." : "Diagnose"}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuery(preset)}
            disabled={isPending}
            className="text-xs px-4 py-2 rounded-full bg-card border shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground text-left max-w-full truncate"
          >
            {preset}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
