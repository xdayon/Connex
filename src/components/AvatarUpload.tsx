import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { strings } from "../i18n/strings";
import { uploadAvatar } from "../lib/avatarUpload";
import { useToast } from "./ui/Toast";
import { Avatar } from "./ui/Avatar";

type Props = { uid: string; name: string; src: string | null; onUploaded: (url: string) => void | Promise<void>; label: string };

export function AvatarUpload({ uid, name, src, onUploaded, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(uid, file, src);
      await onUploaded(url);
    } catch {
      toast(strings.me.photoFailed, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button type="button" aria-label={label} onClick={() => input.current?.click()} disabled={busy} className="relative rounded-full">
        <Avatar src={src} name={name} size="xl" />
        <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-ink bg-volt text-ink">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
    </div>
  );
}
